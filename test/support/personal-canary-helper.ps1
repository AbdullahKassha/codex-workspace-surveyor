# Private canary experiment only. Personal execution needs separate consent.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
$InformationPreference = 'SilentlyContinue'
$streams = [System.Collections.Generic.List[System.IO.FileStream]]::new()
$deadline = [DateTime]::UtcNow.AddSeconds(30)
$inputBytes = 0
$fileLimit = 16777216
$sid = $null
$outcome = 'io'
$phase = 'input'
$faultReached = 'none'
$partialWritten = $false
$opened = 0
$copied = $false
$closed = $true
$nonce = ''
$lease = $null
$keyLease = $null
$operation = ''
function Send-Frame($value) {
    [Console]::Out.WriteLine(($value | ConvertTo-Json -Compress -Depth 8))
    [Console]::Out.Flush()
}
function Receive-Line {
    # Read individual characters: never allocate an unbounded incoming line.
    $line = [System.Text.StringBuilder]::new()
    while ($true) {
        $remaining = [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds
        if ($remaining -le 0) { throw 'deadline' }
        $buffer = [char[]]::new(1)
        $task = [Console]::In.ReadAsync($buffer, 0, 1)
        if (-not $task.Wait($remaining)) { throw 'deadline' }
        if ($task.Result -eq 0) { throw 'eof' }
        $script:inputBytes += [System.Text.Encoding]::UTF8.GetByteCount([string]$buffer[0])
        if ($script:inputBytes -gt 8192) { throw 'input-limit' }
        if ($buffer[0] -eq "`n") { return $line.ToString() }
        if ($line.Length -ge 8192) { throw 'input-limit' }
        [void]$line.Append($buffer[0])
    }
}
function Check-Object([string]$path, [bool]$directory) {
    $item = if ($directory) { [System.IO.DirectoryInfo]::new($path) } else { [System.IO.FileInfo]::new($path) }
    $item.Refresh()
    if (-not $item.Exists -or ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'scope' }
    if (-not $directory -and $item.Length -gt $fileLimit) { throw 'limit' }
    return $item
}
function New-Security([bool]$directory) {
    $security = if ($directory) { [System.Security.AccessControl.DirectorySecurity]::new() }
                else { [System.Security.AccessControl.FileSecurity]::new() }
    $security.SetOwner($sid)
    $security.SetAccessRuleProtection($true, $false)
    $inheritance = if ($directory) {
        [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
        [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
    } else { [System.Security.AccessControl.InheritanceFlags]::None }
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($sid,
        [System.Security.AccessControl.FileSystemRights]::FullControl, $inheritance,
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow)
    [void]$security.AddAccessRule($rule)
    return $security
}
function Test-Security($security, [bool]$directory) {
    $raw = [System.Security.AccessControl.RawSecurityDescriptor]::new($security.GetSecurityDescriptorBinaryForm(), 0)
    if (($raw.ControlFlags -band [System.Security.AccessControl.ControlFlags]::DiscretionaryAclPresent) -eq 0 -or
        $null -eq $raw.DiscretionaryAcl -or $raw.DiscretionaryAcl.Count -ne 1 -or
        -not $security.AreAccessRulesProtected -or -not $security.GetOwner([System.Security.Principal.SecurityIdentifier]).Equals($sid)) { return $false }
    $rules = $security.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier])
    if ($rules.Count -ne 1) { return $false }
    $rule = $rules[0]
    $inheritance = if ($directory) { 3 } else { 0 }
    return $rule.IdentityReference.Equals($sid) -and -not $rule.IsInherited -and
        $rule.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow -and
        $rule.FileSystemRights -eq [System.Security.AccessControl.FileSystemRights]::FullControl -and
        [int]$rule.InheritanceFlags -eq $inheritance -and [int]$rule.PropagationFlags -eq 0
}
function Verify-Security([string]$path, [bool]$directory) {
    $item = Check-Object $path $directory
    $actual = [System.IO.FileSystemAclExtensions]::GetAccessControl($item,
        [System.Security.AccessControl.AccessControlSections]::Owner -bor [System.Security.AccessControl.AccessControlSections]::Access)
    if (-not (Test-Security $actual $directory)) { $script:outcome = 'acl-refused'; throw 'acl' }
}
function Create-Directory([string]$path) {
    if ([System.IO.Directory]::Exists($path) -or [System.IO.File]::Exists($path)) { throw 'existing' }
    [System.IO.FileSystemAclExtensions]::Create([System.IO.DirectoryInfo]::new($path), (New-Security $true))
    Verify-Security $path $true
}
function Create-File([string]$path) {
    $stream = [System.IO.FileSystemAclExtensions]::Create([System.IO.FileInfo]::new($path),
        [System.IO.FileMode]::CreateNew, [System.Security.AccessControl.FileSystemRights]::FullControl,
        [System.IO.FileShare]::Read, 4096, [System.IO.FileOptions]::None, (New-Security $false))
    $streams.Add($stream)
    # Fresh OS descriptor read through the new handle, before writing bytes.
    if (-not (Test-Security ([System.IO.FileSystemAclExtensions]::GetAccessControl($stream)) $false)) {
        $script:outcome = 'acl-refused'; throw 'acl'
    }
    return $stream
}
function Close-Stream($stream) { $stream.Dispose(); [void]$streams.Remove($stream) }
function Command([string]$expected) {
    $value = (Receive-Line) | ConvertFrom-Json
    if ((@($value.PSObject.Properties.Name) -join ',') -cne 'command' -or $value.command -cne $expected) { throw 'protocol' }
}
function Closure {
    if ($request.mode -eq 'synthetic') { return }
    foreach ($name in $request.writers) {
        $processes = [System.Diagnostics.Process]::GetProcessesByName($name)
        try { if ($processes.Count -ne 0) { $script:outcome='closure-refused'; throw 'closure' } }
        finally { foreach ($process in $processes) { $process.Dispose() } }
    }
}
function Source-Set {
    if ([System.IO.File]::Exists("$source-journal") -or [System.IO.Directory]::Exists("$source-journal")) { throw 'companions' }
    $wal = [System.IO.File]::Exists("$source-wal")
    $shm = [System.IO.File]::Exists("$source-shm")
    if ($wal -ne $shm -or [System.IO.Directory]::Exists("$source-wal") -or [System.IO.Directory]::Exists("$source-shm")) { throw 'companions' }
    $names = @('database.sqlite')
    if ($wal) { $names += @('database.sqlite-wal','database.sqlite-shm') }
    return ,$names
}
function Source-Path([int]$index) {
    return $(if ($index -eq 0) { $source } elseif ($index -eq 1) { "$source-wal" } else { "$source-shm" })
}
function Read-Stream($stream, $entry, [bool]$verify) {
    if ($stream.Length -ne $entry.size -or $stream.Length -gt $fileLimit) { $script:outcome='unstable'; throw 'length' }
    $stream.Position = 0
    $bytes = [byte[]]::new([int]$entry.size + 1)
    $count = 0
    do { $n=$stream.Read($bytes,$count,$bytes.Length-$count); $count+=$n } while ($n -gt 0 -and $count -lt $bytes.Length)
    if ($count -ne $entry.size) { $script:outcome='unstable'; throw 'length' }
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    try { $digest=[Convert]::ToHexString($hasher.ComputeHash($bytes,0,$count)).ToLowerInvariant() }
    finally { $hasher.Dispose() }
    if ($verify -and $digest -cne $entry.digest) { $script:outcome='unstable'; throw 'digest' }
    $entry.digest = $digest
    return ,$bytes
}
function Frame([string]$stage) {
    Send-Frame @{stage=$stage;run=$nonce;count=$opened;protected=$true}
}
function Verify-Scratch {
    Verify-Security $root $true
    Verify-Security $owner $false
    foreach ($area in @('acquisition','analysis')) {
        $directory=[System.IO.Path]::Combine($root,$area)
        Verify-Security $directory $true
        $entries=@([System.IO.Directory]::EnumerateFileSystemEntries($directory))
        if ($entries.Count -ne $manifest.Count) { $script:outcome='acl-refused'; throw 'entries' }
        foreach ($entry in $manifest) { Verify-Security ([System.IO.Path]::Combine($directory,$entry.name)) $false }
    }
}
function Descriptor-Fault([string]$path, [bool]$directory) {
    $security=New-Security $directory
    $everyone=[System.Security.Principal.SecurityIdentifier]::new([System.Security.Principal.WellKnownSidType]::WorldSid,$null)
    [void]$security.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($everyone,
        [System.Security.AccessControl.FileSystemRights]::Read,[System.Security.AccessControl.AccessControlType]::Allow))
    $item=if($directory){[System.IO.DirectoryInfo]::new($path)}else{[System.IO.FileInfo]::new($path)}
    [System.IO.FileSystemAclExtensions]::SetAccessControl($item,$security)
}
function Read-Control($stream, [int]$limit) {
    if ($stream.Length -gt $limit) { throw 'control-limit' }
    $stream.Position=0; $bytes=[byte[]]::new([int]$stream.Length)
    $stream.ReadExactly($bytes,0,$bytes.Length)
    return ,$bytes
}
function Mac([byte[]]$key, [string]$payload) {
    $hmac=[System.Security.Cryptography.HMACSHA256]::new($key)
    try { return [Convert]::ToHexString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($payload))).ToLowerInvariant() }
    finally { $hmac.Dispose() }
}
function Open-Control([string]$path, [System.IO.FileShare]$share) {
    Verify-Security $path $false
    $stream=[IO.FileStream]::new($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,$share)
    if (-not (Test-Security ([IO.FileSystemAclExtensions]::GetAccessControl($stream)) $false)) {$stream.Dispose();throw 'acl'}
    return $stream
}
function Recovery-Payload {
    Verify-Security $store $true
    $entries=@([IO.Directory]::EnumerateFileSystemEntries($store))
    if ($entries.Count -ne 2 -or @($entries | Where-Object { [IO.Path]::GetFileName($_) -notin @('key','record') }).Count) {throw 'entries'}
    $key=Read-Control $keyLease 32
    if($key.Length -ne 32){throw 'key'}
    $record=[Text.Encoding]::UTF8.GetString((Read-Control $lease 8192)) | ConvertFrom-Json
    if((@($record.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'mac,payload' -or
       $record.payload -isnot [string] -or $record.mac -cnotmatch '^[a-f0-9]{64}$'){throw 'record'}
    $expected=Mac $key $record.payload
    $difference=0;for($j=0;$j -lt 64;$j++){$difference=$difference -bor ([int]$record.mac[$j] -bxor [int]$expected[$j])}
    if($difference -ne 0){throw 'authentication'}
    return $record.payload
}
function Persistence-Fault([string]$name) {
    if($request.fault -eq $name){$script:faultReached=$name;throw 'SYNTHETIC_PRIVATE_CANARY'}
}
function Recovery-Exists([string]$path) {
    try { [void][IO.File]::GetAttributes($path); return $true }
    catch {
        $errorObject=$_.Exception
        while($null -ne $errorObject.InnerException){$errorObject=$errorObject.InnerException}
        if($errorObject -is [IO.FileNotFoundException] -or $errorObject -is [IO.DirectoryNotFoundException]){return $false}
        throw
    }
}
function Verify-RecoveryScratch($inventory) {
    if(-not (Recovery-Exists $root)){return}
    Verify-Security $root $true
    $actual=[Collections.Generic.List[string]]::new()
    foreach($path in [IO.Directory]::EnumerateFileSystemEntries($root)){
        $name=[IO.Path]::GetFileName($path)
        if($name -notin @('owner','acquisition','analysis')){throw 'entries'}
        $actual.Add($name)
        if($name -ne 'owner'){
            Verify-Security $path $true
            foreach($child in [IO.Directory]::EnumerateFileSystemEntries($path)){
                if($actual.Count -ge 9){throw 'limit'}
                $actual.Add($name+'/'+[IO.Path]::GetFileName($child))
            }
        }
        if($actual.Count -gt 9){throw 'limit'}
    }
    $total=0L
    foreach($name in $actual){
        $entries=@($inventory.entries | Where-Object {$_.name -ceq $name})
        if($entries.Count -ne 1){throw 'entries'}
        $path=[IO.Path]::Combine($root,$name)
        Verify-Security $path ($entries[0].kind -eq 'directory')
        if($entries[0].kind -eq 'file'){$total+=([IO.FileInfo]::new($path)).Length}
    }
    if($total -gt 67117056){throw 'limit'}
    $marker=[IO.Path]::Combine($root,'owner')
    if(Recovery-Exists $marker){
        if(([IO.FileInfo]::new($marker)).Length -ne 36 -or [IO.File]::ReadAllText($marker) -cne $inventory.nonce){throw 'ownership'}
    }elseif($actual.Count -ne 0){throw 'ownership'}
}
function Delete-RecoveryScratch($inventory) {
    $members=@($inventory.entries | Where-Object {$_.kind -eq 'file' -and $_.name -ne 'owner'}) +
        @($inventory.entries | Where-Object {$_.kind -eq 'directory'}) +
        @([pscustomobject]@{name='owner';kind='file'},[pscustomobject]@{name='root';kind='directory'})
    $index=0;$paused=$false
    foreach($member in $members){
        $message=(Receive-Line) | ConvertFrom-Json
        if((@($message.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'command,name' -or
            $message.command -cne 'delete-recovery' -or $message.name -cne $member.name){throw 'protocol'}
        # The lease is retained through verification, the synchronous delete and
        # its acknowledgement. No timer callback or background task disposes it.
        if($null -eq $lease){throw 'lifetime'}
        Verify-RecoveryScratch $inventory
        $path=if($member.name -eq 'root'){$root}else{[IO.Path]::Combine($root,$member.name)}
        $existed=Recovery-Exists $path
        if([DateTime]::UtcNow -ge $deadline){throw 'deadline'}
        if($existed){
            if($member.kind -eq 'file'){[IO.File]::Delete($path)}else{[IO.Directory]::Delete($path,$false)}
            if(Recovery-Exists $path){throw 'deletion'}
        }
        $index++
        if($existed -and -not $paused -and $member.kind -eq 'file' -and $member.name -ne 'owner' -and $request.probe -ne 'none'){
            $paused=$true
            Send-Frame @{stage='recovery-paused';run=$nonce;count=$index;deleted=$true}
            $delay=if($request.probe -eq 'slow'){
                [Math]::Max(1,[Math]::Ceiling(($deadline.AddSeconds(5)-[DateTime]::UtcNow).TotalMilliseconds))
            }else{1000}
            Start-Sleep -Milliseconds ([int]$delay)
        }
        Send-Frame @{stage='recovery-deleted';run=$nonce;count=$index;deleted=$existed}
        # EOF, expired deadlines and malformed commands stop the next dispatch;
        # finally cannot release exclusion until this operation has returned.
    }
    Verify-RecoveryScratch $inventory
    if(Recovery-Exists $root){throw 'residual'}
}
try {
    if (-not $IsWindows -or $PSVersionTable.PSVersion.Major -ne 7) { throw 'host' }
    $request=(Receive-Line) | ConvertFrom-Json
    $nonce=[Guid]::ParseExact($request.nonce,'D').ToString()
    $operation=$request.operation
    $identity=[System.Security.Principal.WindowsIdentity]::GetCurrent()
    try { $sid=$identity.User } finally { $identity.Dispose() }
    if($operation -eq 'locate'){
        if((@($request.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'nonce,operation'){throw 'protocol'}
        $phase='location'
        $location=[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
        if([string]::IsNullOrEmpty($location)){throw 'location'}
        Send-Frame @{stage='location';run=$nonce;store=[IO.Path]::Combine($location,'WorkspaceSurveyor-Canary-Recovery')}
        $outcome='ok';return
    }
    if($operation -eq 'recover'){
        if((@($request.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'mode,nonce,operation,probe,store' -or
            $request.mode -notin @('synthetic','personal') -or $request.probe -notin @('none','short','slow') -or
            ($request.mode -eq 'personal' -and $request.probe -ne 'none') -or
            ($request.mode -eq 'synthetic' -and $env:WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION -ne '1')){throw 'protocol'}
        $phase='recovery';$store=[IO.Path]::GetFullPath($request.store)
        Verify-Security $store $true
        $lease=Open-Control ([IO.Path]::Combine($store,'record')) ([IO.FileShare]::None)
        $keyLease=Open-Control ([IO.Path]::Combine($store,'key')) ([IO.FileShare]::Read)
        $payload=Recovery-Payload
        Send-Frame @{stage='recovery-held';run=$nonce;payload=$payload}
        # Node authenticates the fixed layout/identities before permitting descriptor reads.
        Command 'verify-recovery'
        $inventory=$payload | ConvertFrom-Json
        $root=$inventory.root.path
        Verify-RecoveryScratch $inventory
        Frame 'recovery-verified'
        Delete-RecoveryScratch $inventory
        Command 'release';$outcome='ok';return
    }
    if ($operation -ne 'acquire' -or (@($request.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'count,fault,mode,nonce,operation,root,source,store,writers' -or
        $request.mode -notin @('synthetic','personal') -or $request.count -notin @(1,3) -or
        $request.fault -notin @('none','protected','descriptor','partial-copy','diagnostic','recovery-create','recovery-descriptor','recovery-write','recovery-flush','recovery-readback') -or
        ($request.mode -eq 'personal' -and $request.fault -ne 'none')) { throw 'protocol' }
    $root=[System.IO.Path]::GetFullPath($request.root)
    $source=[System.IO.Path]::GetFullPath($request.source)
    if ($request.mode -eq 'personal') {
        if ($request.writers.Count -lt 1 -or $request.writers.Count -gt 12) { throw 'closure' }
        foreach ($name in $request.writers) { if ($name -cnotmatch '^[A-Za-z0-9_.-]{1,64}$') { throw 'closure' } }
    } elseif ($request.writers.Count -ne 0) { throw 'protocol' }
    $temporary=[System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
    if ([System.IO.Path]::GetDirectoryName($root) -ne $temporary -or
        [System.IO.Path]::GetFileName($root) -cnotmatch '^workspace-surveyor-canary-[A-Za-z0-9]+$' -or
        $root -eq $source -or $source.StartsWith("$root\",[StringComparison]::OrdinalIgnoreCase) -or
        $root.StartsWith("$source\",[StringComparison]::OrdinalIgnoreCase)) { throw 'scope' }
    $owner=[System.IO.Path]::Combine($root,'owner')
    $rootItem=Check-Object $root $true
    [void](Check-Object $owner $false)
    $entries=@([System.IO.Directory]::EnumerateFileSystemEntries($root))
    if ($entries.Count -ne 1 -or $entries[0] -cne $owner -or [System.IO.File]::ReadAllText($owner) -cne $nonce) { throw 'ownership' }
    $phase='closure'
    Closure
    if ($request.mode -eq 'personal') { Start-Sleep -Milliseconds 1000; Closure }
    $phase='protect'
    [System.IO.FileSystemAclExtensions]::SetAccessControl($rootItem,(New-Security $true))
    [System.IO.FileSystemAclExtensions]::SetAccessControl([System.IO.FileInfo]::new($owner),(New-Security $false))
    Verify-Security $root $true; Verify-Security $owner $false
    if ($request.fault -eq 'protected') { $faultReached='after-protection'; throw "SYNTHETIC_PRIVATE_CANARY $root" }
    Create-Directory ([System.IO.Path]::Combine($root,'acquisition'))
    Create-Directory ([System.IO.Path]::Combine($root,'analysis'))
    $names=Source-Set
    if($names.Count -ne $request.count){throw 'companions'}
    $destinations=@{}
    foreach($area in @('acquisition','analysis')){foreach($name in $names){
        $path=[IO.Path]::Combine($root,$area,$name)
        $destinations[$path]=Create-File $path
    }}
    $phase='persistence'
    $store=[IO.Path]::GetFullPath($request.store)
    if(@([IO.Directory]::EnumerateFileSystemEntries($store)).Count -ne 0){throw 'store'}
    [IO.FileSystemAclExtensions]::SetAccessControl((Check-Object $store $true),(New-Security $true))
    Verify-Security $store $true
    Persistence-Fault 'recovery-create'
    $key=[Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    $keyWriter=Create-File ([IO.Path]::Combine($store,'key'))
    $keyWriter.Write($key,0,32);$keyWriter.Flush($true);Close-Stream $keyWriter
    $keyLease=Open-Control ([IO.Path]::Combine($store,'key')) ([IO.FileShare]::Read)
    Frame 'prepared'
    $binding=(Receive-Line) | ConvertFrom-Json
    if((@($binding.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'command,payload' -or
       $binding.command -cne 'persist' -or $binding.payload -isnot [string]){throw 'protocol'}
    $recordBytes=[Text.Encoding]::UTF8.GetBytes((@{payload=$binding.payload;mac=(Mac $key $binding.payload)} | ConvertTo-Json -Compress))
    if($recordBytes.Length -gt 8192){throw 'control-limit'}
    $recordPath=[IO.Path]::Combine($store,'record')
    $recordWriter=Create-File $recordPath
    if($request.fault -eq 'recovery-descriptor'){
        Close-Stream $recordWriter;Descriptor-Fault $recordPath $false
        $faultReached='recovery-descriptor';Verify-Security $recordPath $false
    }
    Persistence-Fault 'recovery-write'
    $recordWriter.Write($recordBytes,0,$recordBytes.Length)
    Persistence-Fault 'recovery-flush'
    $recordWriter.Flush($true);Close-Stream $recordWriter
    $lease=Open-Control $recordPath ([IO.FileShare]::Read)
    Persistence-Fault 'recovery-readback'
    if((Recovery-Payload) -cne $binding.payload){throw 'readback'}
    Frame 'recovery-ready'
    Command 'acquire'
    $phase='open'
    $names=Source-Set
    $manifest=[System.Collections.Generic.List[object]]::new()
    $readers=[System.Collections.Generic.List[System.IO.FileStream]]::new()
    $total=0
    for ($i=0;$i -lt $names.Count;$i++) {
        $path=Source-Path $i
        [void](Check-Object $path $false)
        $reader=[System.IO.FileStream]::new($path,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::Read)
        $streams.Add($reader);$readers.Add($reader);$opened=$readers.Count
        $total+=$reader.Length
        if ($total -gt 33554432) { throw 'limit' }
        $manifest.Add([pscustomobject]@{name=$names[$i];size=$reader.Length;digest=''})
    }
    $phase='held'
    for ($i=0;$i -lt $manifest.Count;$i++) { [void](Read-Stream $readers[$i] $manifest[$i] $false) }
    Send-Frame @{stage='held';run=$nonce;count=$opened;manifest=@($manifest.ToArray())}
    Command 'copy'
    if((Recovery-Payload) -cne $binding.payload){throw 'persistence'}
    Closure
    $phase='copy'
    for($i=0;$i -lt $manifest.Count;$i++) {
        $bytes=Read-Stream $readers[$i] $manifest[$i] $true
        foreach($area in @('acquisition','analysis')) {
            $path=[System.IO.Path]::Combine($root,$area,$manifest[$i].name)
            $writer=$destinations[$path]
            if($request.fault -eq 'descriptor') {
                Close-Stream $writer;Descriptor-Fault $path $false;$faultReached='destination-descriptor';Verify-Security $path $false
            }
            if($request.fault -eq 'partial-copy') {
                $amount=[Math]::Min(16,[int]$manifest[$i].size)
                $writer.Write($bytes,0,$amount);$writer.Flush()
                if($amount -le 0 -or $writer.Length -ne $amount -or $writer.Position -ne $amount){throw 'write'}
                $partialWritten=$true;$faultReached='after-partial-write';throw "SYNTHETIC_PRIVATE_CANARY $root"
            }
            $writer.Write($bytes,0,[int]$manifest[$i].size);$writer.Flush()
            [void](Read-Stream $writer $manifest[$i] $true);Close-Stream $writer;Verify-Security $path $false
        }
    }
    Verify-Scratch
    $copied=$true;Frame 'copied'
    Command 'verify'
    $phase='verify'
    if((Recovery-Payload) -cne $binding.payload){throw 'persistence'}
    if (((Source-Set) -join ',') -cne ($names -join ',')) { $outcome='unstable';throw 'set' }
    for($i=0;$i -lt $manifest.Count;$i++) {
        [void](Read-Stream $readers[$i] $manifest[$i] $true)
        $path=[System.IO.Path]::Combine($root,'acquisition',$manifest[$i].name)
        $check=[System.IO.FileStream]::new($path,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::Read)
        $streams.Add($check);[void](Read-Stream $check $manifest[$i] $true);Close-Stream $check
    }
    Verify-Scratch;Closure
    if($request.fault -eq 'diagnostic') {
        $faultReached='diagnostic';[Console]::Error.WriteLine("SYNTHETIC_PRIVATE_CANARY $root");throw 'diagnostic'
    }
    Frame 'verified'
    Command 'release'
    $phase='release';$outcome='ok'
} catch {
    $exception=$_.Exception
    while($null -ne $exception.InnerException){$exception=$exception.InnerException}
    if($exception.HResult -eq -2147024864){$outcome='sharing-refused'}
} finally {
    foreach($stream in $streams){try{$stream.Dispose()}catch{$closed=$false}}
    if ($outcome -eq 'ok' -and $operation -eq 'acquire') { try { Closure } catch { $outcome='closure-refused' } }
    # Lifetime handles are last: no source/copy work follows their release.
    if($closed){foreach($control in @($keyLease,$lease)){if($null -ne $control){try{$control.Dispose()}catch{$closed=$false}}}}
    Send-Frame @{stage='finished';run=$nonce;outcome=$outcome;closed=$closed;copied=$copied;phase=$phase;
        fault=$faultReached;partialWritten=$partialWritten;opened=$opened}
}
