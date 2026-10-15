# Incident-only functions. Sourced by the reviewed helper; no standalone entry.
$legacyStreams=[Collections.Generic.List[IO.FileStream]]::new()
$legacyLifetime=[Collections.Generic.List[IO.FileStream]]::new()
function Legacy-Paths([string]$original) {
    return @{original=$original;seal=$original+'-Legacy';active=$original+'-Active'}
}
function Legacy-ReadEnvelope($recordStream,$keyStream,[int]$limit=3072) {
    $key=Read-Control $keyStream 32
    if($key.Length -ne 32){throw 'key'}
    $record=[Text.Encoding]::UTF8.GetString((Read-Control $recordStream 8192)) | ConvertFrom-Json
    if((@($record.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'mac,payload' -or
        $record.payload -isnot [string] -or $record.mac -cnotmatch '^[a-f0-9]{64}$' -or
        [Text.Encoding]::UTF8.GetByteCount($record.payload) -gt $limit){throw 'record'}
    $expected=Mac $key $record.payload
    $difference=0;for($j=0;$j -lt 64;$j++){$difference=$difference -bor ([int]$record.mac[$j] -bxor [int]$expected[$j])}
    if($difference -ne 0){throw 'authentication'}
    return $record.payload
}
function Legacy-Control([string]$path,[IO.FileShare]$share) {
    $stream=Open-Control $path $share
    $legacyLifetime.Add($stream)
    return $stream
}
function Legacy-Protection([string]$path,[bool]$registered) {
    if($registered){Verify-Security $path $false;return}
    # Preservation does not assert ownership or authorize deletion. An inherited
    # sole current-user FullControl rule protects an ordinary child too.
    $item=Check-Object $path $false
    $security=[IO.FileSystemAclExtensions]::GetAccessControl($item)
    $raw=[Security.AccessControl.RawSecurityDescriptor]::new($security.GetSecurityDescriptorBinaryForm(),0)
    $rules=$security.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])
    if(($raw.ControlFlags -band [Security.AccessControl.ControlFlags]::DiscretionaryAclPresent) -eq 0 -or
       $null -eq $raw.DiscretionaryAcl -or $raw.DiscretionaryAcl.Count -ne 1 -or $rules.Count -ne 1 -or
       -not $security.GetOwner([Security.Principal.SecurityIdentifier]).Equals($sid) -or
       -not $rules[0].IdentityReference.Equals($sid) -or
       $rules[0].AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
       $rules[0].FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or
       [int]$rules[0].InheritanceFlags -ne 0 -or [int]$rules[0].PropagationFlags -ne 0){$script:outcome='acl-refused';throw 'acl'}
}
function Legacy-Scratch($value,[bool]$hold,[bool]$partial=$false) {
    $legacyRoot=$value.root.path
    $temporary=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
    if([IO.Path]::GetDirectoryName($legacyRoot) -cne $temporary -or
       [IO.Path]::GetFileName($legacyRoot) -cnotmatch '^workspace-surveyor-canary-[A-Za-z0-9]+$' -or
       $value.entries.Count -gt 17 -or $value.entries.Count -lt 1){throw 'scope'}
    if($partial -and -not (Recovery-Exists $legacyRoot)){return}
    Verify-Security $legacyRoot $true
    $actual=[Collections.Generic.List[string]]::new()
    foreach($path in [IO.Directory]::EnumerateFileSystemEntries($legacyRoot)){
        $name=[IO.Path]::GetFileName($path)
        if($actual.Count -ge 17){throw 'limit'}
        $actual.Add($name)
        if($name -in @('acquisition','analysis')){
            Verify-Security $path $true
            foreach($child in [IO.Directory]::EnumerateFileSystemEntries($path)){
                if($actual.Count -ge 17){throw 'limit'}
                $actual.Add($name+'/'+[IO.Path]::GetFileName($child))
            }
        }
    }
    if(-not $partial -and $actual.Count -ne $value.entries.Count){throw 'entries'}
    $total=0L
    foreach($name in $actual){
        if($name -cnotmatch '^(?:(?:acquisition|analysis)/)?[A-Za-z0-9_.-]{1,64}$' -or $name -in @('.','..')){throw 'scope'}
        $matches=@($value.entries | Where-Object {$_.name -ceq $name})
        if($matches.Count -ne 1){throw 'entries'}
        $entry=$matches[0];$path=[IO.Path]::Combine($legacyRoot,$name)
        if($entry.kind -eq 'directory'){
            if($name -notin @('acquisition','analysis')){throw 'scope'}
            Verify-Security $path $true
        }elseif($entry.kind -eq 'file'){
            Legacy-Protection $path $entry.registered
            if(([IO.FileInfo]::new($path)).Length -ne $entry.size){throw 'unstable'}
            $total+=$entry.size
            if($hold){
                $stream=[IO.FileStream]::new($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
                $legacyStreams.Add($stream)
                if($stream.Length -ne $entry.size){throw 'unstable'}
            }
        }else{throw 'scope'}
    }
    if($total -gt 68157440){throw 'limit'}
    $marker=[IO.Path]::Combine($legacyRoot,'owner')
    if(Recovery-Exists $marker){
        if(([IO.FileInfo]::new($marker)).Length -ne 36 -or [IO.File]::ReadAllText($marker) -cne $value.nonce){throw 'ownership'}
    }elseif(-not $partial -or $actual.Count -ne 0){throw 'ownership'}
}
function Legacy-RegisteredInventory($value,$original) {
    # The declaration cannot replace or reduce the original signed inventory.
    # This comparison uses authenticated controls, not current directory names.
    if($value.root.path -cne $original.root.path -or $value.root.dev -cne $original.root.dev -or
       $value.root.ino -cne $original.root.ino -or $value.nonce -cne $original.nonce){throw 'ownership'}
    $registered=@($value.entries | Where-Object {$_.registered -is [bool] -and $_.registered})
    if($registered.Count -ne $original.entries.Count){throw 'ownership'}
    foreach($signed in $original.entries){
        $matches=@($value.entries | Where-Object {$_.name -ceq $signed.name})
        if($matches.Count -ne 1){throw 'ownership'}
        $entry=$matches[0]
        if($entry.registered -isnot [bool] -or -not $entry.registered -or
           $entry.kind -cne $signed.kind -or $entry.dev -cne $signed.dev -or $entry.ino -cne $signed.ino){throw 'ownership'}
    }
}
function Hold-LegacyOriginal($value,[string]$original) {
    Verify-Security $original $true
    if(@([IO.Directory]::EnumerateFileSystemEntries($original)).Count -ne 2){throw 'entries'}
    $oldRecord=Legacy-Control ([IO.Path]::Combine($original,'record')) ([IO.FileShare]::None)
    $oldKey=Legacy-Control ([IO.Path]::Combine($original,'key')) ([IO.FileShare]::Read)
    $oldPayload=Legacy-ReadEnvelope $oldRecord $oldKey 6144
    $bytes=[Text.Encoding]::UTF8.GetBytes($oldPayload)
    if([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant() -cne $value.recordHash){throw 'authentication'}
    Legacy-RegisteredInventory $value ($oldPayload | ConvertFrom-Json)
}
function Open-Legacy([string]$original,[bool]$hold,[bool]$exclusive=$false,[bool]$disposal=$false) {
    $paths=Legacy-Paths $original
    Verify-Security $paths.seal $true
    $members=@('key','record');if($disposal -and (Recovery-Exists ([IO.Path]::Combine($paths.seal,'disposal')))){$members+=@('disposal')}
    $count=0
    foreach($path in [IO.Directory]::EnumerateFileSystemEntries($paths.seal)){
        $count++;if($count -gt $members.Count -or [IO.Path]::GetFileName($path) -cnotin $members){throw 'entries'}
    }
    if($count -ne $members.Count){throw 'entries'}
    $sharing=if($exclusive){[IO.FileShare]::None}else{[IO.FileShare]::Read}
    $sealRecord=Legacy-Control ([IO.Path]::Combine($paths.seal,'record')) $sharing
    $sealKey=Legacy-Control ([IO.Path]::Combine($paths.seal,'key')) ([IO.FileShare]::Read)
    $payload=Legacy-ReadEnvelope $sealRecord $sealKey
    $value=$payload | ConvertFrom-Json
    if($value.version -ne 1 -or $value.status -cne 'preserved-unverified' -or $value.original -cne $original){throw 'record'}
    if($hold){
        Hold-LegacyOriginal $value $original
        Legacy-Scratch $value $true
    }
    return $payload
}
function Legacy-DisposalIntent([string]$seal,[string]$payload,[bool]$create,[bool]$readOnly=$false) {
    if($readOnly -and $create){throw 'protocol'}
    $hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($payload))).ToLowerInvariant()
    $intent='{"version":1,"action":"user-directed-disposal","manifestHash":"'+$hash+'"}'
    $path=[IO.Path]::Combine($seal,'disposal')
    $keyStream=Legacy-Control ([IO.Path]::Combine($seal,'key')) ([IO.FileShare]::Read)
    $key=Read-Control $keyStream 32
    if(-not (Recovery-Exists $path)){
        if(-not $create){return $null}
        $bytes=[Text.Encoding]::UTF8.GetBytes(((@{payload=$intent;mac=(Mac $key $intent)} | ConvertTo-Json -Compress)+"`n"))
        $writer=Create-File $path
        $writer.Write($bytes,0,$bytes.Length);$writer.Flush($true)
    }else{
        Verify-Security $path $false
        $access=if($readOnly){[IO.FileAccess]::Read}else{[IO.FileAccess]::ReadWrite}
        $writer=[IO.FileStream]::new($path,[IO.FileMode]::Open,$access,[IO.FileShare]::Read)
        $legacyLifetime.Add($writer)
        if(-not (Test-Security ([IO.FileSystemAclExtensions]::GetAccessControl($writer)) $false)){throw 'acl'}
    }
    $text=[Text.Encoding]::UTF8.GetString((Read-Control $writer 4096))
    if(-not $text.EndsWith("`n")){throw 'record'}
    $lines=$text.Substring(0,$text.Length-1).Split("`n")
    if($lines.Count -lt 1 -or $lines.Count -gt 19){throw 'limit'}
    for($i=0;$i -lt $lines.Count;$i++){
        $envelope=$lines[$i] | ConvertFrom-Json
        $expected=if($i -eq 0){$intent}else{'{"manifestHash":"'+$hash+'","index":'+$i+'}'}
        if((@($envelope.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'mac,payload' -or
           $envelope.payload -cne $expected -or $envelope.mac -cnotmatch '^[a-f0-9]{64}$'){throw 'record'}
        $mac=Mac $key $expected;$difference=0
        for($j=0;$j -lt 64;$j++){$difference=$difference -bor ([int]$envelope.mac[$j] -bxor [int]$mac[$j])}
        if($difference -ne 0){throw 'authentication'}
    }
    return @{writer=$writer;key=$key;hash=$hash;completed=$lines.Count-1}
}
function Legacy-DisposalCoverage($value,$members,[int]$completed) {
    if($completed -gt $members.Count){throw 'record'}
    Legacy-Scratch $value $false ($completed -gt 0)
    for($i=0;$i -lt $members.Count;$i++){
        $name=$members[$i].name
        $path=if($name -ceq 'root'){$value.root.path}else{[IO.Path]::Combine($value.root.path,$name)}
        if((Recovery-Exists $path) -ne ($i -ge $completed)){throw 'ownership'}
    }
}
function Legacy-SecurityStamp($value) {
    $seal=$value.original+'-Legacy'
    $paths=@($value.original,([IO.Path]::Combine($value.original,'key')),([IO.Path]::Combine($value.original,'record')),
        $seal,([IO.Path]::Combine($seal,'key')),([IO.Path]::Combine($seal,'record')),([IO.Path]::Combine($seal,'disposal')),$value.root.path)
    foreach($entry in $value.entries){$paths+=@([IO.Path]::Combine($value.root.path,$entry.name))}
    $descriptors=[Collections.Generic.List[string]]::new()
    foreach($path in $paths){
        if(-not (Recovery-Exists $path)){$descriptors.Add('absent');continue}
        $directory=([IO.File]::GetAttributes($path) -band [IO.FileAttributes]::Directory) -ne 0
        $item=Check-Object $path $directory
        $security=[IO.FileSystemAclExtensions]::GetAccessControl($item,
            [Security.AccessControl.AccessControlSections]::Owner -bor [Security.AccessControl.AccessControlSections]::Access)
        $descriptors.Add([Convert]::ToBase64String($security.GetSecurityDescriptorBinaryForm()))
    }
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData(
        [Text.Encoding]::UTF8.GetBytes(($descriptors -join '|')))).ToLowerInvariant()
}
function Dispose-Legacy([string]$original,[bool]$preview=$false) {
    $payload=Open-Legacy $original $false $true $true
    $value=$payload | ConvertFrom-Json;$paths=Legacy-Paths $original
    if(-not $preview -and (Recovery-Exists $paths.active)){throw 'existing'}
    $progress=Legacy-DisposalIntent $paths.seal $payload $false $preview
    $members=@($value.entries | Where-Object {$_.kind -eq 'file' -and $_.name -cne 'owner'}) +
        @($value.entries | Where-Object {$_.kind -eq 'directory'}) +
        @([pscustomobject]@{name='owner';kind='file'},[pscustomobject]@{name='root';kind='directory'})
    $completed=if($null -eq $progress){0}else{$progress.completed}
    if($completed -lt $members.Count){Hold-LegacyOriginal $value $original}
    Legacy-DisposalCoverage $value $members $completed
    Legacy-Scratch $value $true ($completed -gt 0)
    $stamp=Legacy-SecurityStamp $value
    Send-Frame @{stage='legacy-held';run=$nonce;payload=$payload;security=$stamp}
    if($preview){
        Command 'release'
        Legacy-DisposalCoverage $value $members $completed
        if((Legacy-SecurityStamp $value) -cne $stamp){throw 'unstable'}
        $script:outcome='ok';return
    }
    Command 'authorize-disposal'
    if($null -eq $progress){$progress=Legacy-DisposalIntent $paths.seal $payload $true}
    Legacy-DisposalCoverage $value $members $completed
    Frame 'legacy-ready'
    $index=0
    foreach($member in $members){
        $message=(Receive-Line) | ConvertFrom-Json
        if((@($message.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'command,name' -or
           $message.command -cne 'delete-recovery' -or $message.name -cne $member.name){throw 'protocol'}
        if(Recovery-Exists $paths.active){throw 'existing'}
        Legacy-DisposalCoverage $value $members $completed
        $path=if($member.name -ceq 'root'){$value.root.path}else{[IO.Path]::Combine($value.root.path,$member.name)}
        $existed=Recovery-Exists $path
        if([DateTime]::UtcNow -ge $deadline){throw 'deadline'}
        if($existed){
            # Retain write/delete exclusion for all remaining files. Release only
            # this target immediately before its synchronous nonrecursive delete;
            # both exclusive control leases remain held through acknowledgement.
            foreach($stream in $legacyStreams){if([IO.Path]::GetFullPath($stream.Name) -ceq [IO.Path]::GetFullPath($path)){$stream.Dispose()}}
            if($member.kind -ceq 'file'){[IO.File]::Delete($path)}else{[IO.Directory]::Delete($path,$false)}
            if(Recovery-Exists $path){throw 'deletion'}
            # Receipt follows positive absence and precedes acknowledgment. A
            # crash in that gap leaves an unexplained absence and fails closed.
            $receipt='{"manifestHash":"'+$progress.hash+'","index":'+($index+1)+'}'
            $bytes=[Text.Encoding]::UTF8.GetBytes(((@{payload=$receipt;mac=(Mac $progress.key $receipt)} | ConvertTo-Json -Compress)+"`n"))
            if($progress.writer.Length+$bytes.Length -gt 4096){throw 'limit'}
            $progress.writer.Position=$progress.writer.Length
            $progress.writer.Write($bytes,0,$bytes.Length);$progress.writer.Flush($true);$completed=$index+1
        }
        $index++;Send-Frame @{stage='recovery-deleted';run=$nonce;count=$index;deleted=$existed}
    }
    if(Recovery-Exists $value.root.path){throw 'residual'}
    Command 'release';$script:outcome='ok'
}
function Prepare-LegacySeal([string]$original) {
    $paths=Legacy-Paths $original
    if((Recovery-Exists $paths.seal) -or (Recovery-Exists $paths.active)){throw 'existing'}
    Create-Directory $paths.seal
    $writer=Create-File ([IO.Path]::Combine($paths.seal,'key'))
    $key=[Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    $writer.Write($key,0,32);$writer.Flush($true);Close-Stream $writer
    $writer=Create-File ([IO.Path]::Combine($paths.seal,'record'))
    return $writer
}
