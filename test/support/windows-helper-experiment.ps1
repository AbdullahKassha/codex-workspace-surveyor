# Test-only M2a.3 probes and explicitly selected M2a.4 synthetic integration.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
$InformationPreference = 'SilentlyContinue'
$streams = [System.Collections.Generic.List[System.IO.FileStream]]::new()
$deadline = [DateTime]::UtcNow.AddSeconds(30)
$outcome = 'io'
$copied = $false
$closed = $true
$sid = $null
$phase = 'input'
$category = 'none'
$inputBytes = 0
$fault = 'none'
$partialWritten = $false
$integration = $false
$fileLimit = 4096
$opened = 0
$nonce = ''

function Send-Frame($value) {
    [Console]::Out.WriteLine(($value | ConvertTo-Json -Compress -Depth 3))
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
function Receive-Command {
    $command = (Receive-Line) | ConvertFrom-Json
    if (@($command.PSObject.Properties.Name).Count -ne 1 -or
        $command.command -notin @('acquire', 'release', 'cancel')) { throw 'protocol' }
    return $command.command
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
function Equal-Bytes([byte[]]$expected, [byte[]]$actual, [int]$count) {
    if ($count -ne $expected.Length) { return $false }
    for ($j = 0; $j -lt $count; $j++) { if ($expected[$j] -ne $actual[$j]) { return $false } }
    return $true
}

function Integration-Command([string]$expected) {
    $value = (Receive-Line) | ConvertFrom-Json
    if ((@($value.PSObject.Properties.Name) -join ',') -ne 'command' -or $value.command -cne $expected) { throw 'protocol' }
}
function Integration-Frame([string]$stage) {
    Send-Frame @{stage=$stage; run=$nonce; count=$readers.Count; protected=$true}
}
function Read-Retained($reader, $entry) {
    if ($reader.Length -ne $entry.size -or $reader.Length -gt $fileLimit) { $script:outcome='unstable'; throw 'length' }
    $reader.Position = 0
    $buffer = [byte[]]::new([int]$entry.size + 1)
    $count = 0
    do {
        $n = $reader.Read($buffer, $count, $buffer.Length - $count)
        $count += $n
    } while ($n -gt 0 -and $count -lt $buffer.Length)
    if ($count -ne $entry.size) { $script:outcome='unstable'; throw 'length' }
    $hash = [System.Security.Cryptography.SHA256]::Create()
    try { $digest = [Convert]::ToHexString($hash.ComputeHash($buffer, 0, $count)).ToLowerInvariant() }
    finally { $hash.Dispose() }
    if ($digest -cne $entry.digest) { $script:outcome='unstable'; throw 'digest' }
    return ,$buffer
}
function Extra-Rule([string]$path, [bool]$directory) {
    $security = New-Security $directory
    $everyone = [System.Security.Principal.SecurityIdentifier]::new([System.Security.Principal.WellKnownSidType]::WorldSid, $null)
    [void]$security.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($everyone,
        [System.Security.AccessControl.FileSystemRights]::Read, [System.Security.AccessControl.AccessControlType]::Allow))
    $item = if ($directory) { [System.IO.DirectoryInfo]::new($path) } else { [System.IO.FileInfo]::new($path) }
    [System.IO.FileSystemAclExtensions]::SetAccessControl($item, $security)
}
function Verify-IntegrationScratch($manifest) {
    Verify-Security $root $true
    Verify-Security $owner $false
    foreach ($location in @('builder', 'sources', 'scratch', 'scratch/acquisition', 'scratch/analysis')) {
        Verify-Security ([System.IO.Path]::Combine($root, $location)) $true
    }
    foreach ($area in @('acquisition', 'analysis')) {
        $directory = [System.IO.Path]::Combine($root, 'scratch', $area)
        $entries = @([System.IO.Directory]::EnumerateFileSystemEntries($directory))
        if ($entries.Count -ne $manifest.Count) { $script:outcome='acl-refused'; throw 'entries' }
        foreach ($entry in $manifest) { Verify-Security ([System.IO.Path]::Combine($directory, $entry.name)) $false }
    }
}
function Invoke-Integration {
    $script:phase = 'protected'
    if ($request.fault -eq 'protected') {
        $script:fault = 'after-protection'; throw "SYNTHETIC_PRIVATE_HELPER_CANARY $root"
    }
    if ($request.fault -eq 'root-dacl') {
        Extra-Rule $root $true
        $script:fault = 'root-descriptor'
        Verify-Security $root $true
    }
    foreach ($location in @('builder', 'sources', 'scratch', 'scratch/acquisition', 'scratch/analysis')) {
        Create-Directory ([System.IO.Path]::Combine($root, $location))
    }
    $readers = [System.Collections.Generic.List[System.IO.FileStream]]::new()
    Send-Frame @{stage='protected-ready'; run=$nonce; count=0; protected=$true;
        powershell=$PSVersionTable.PSVersion.ToString(); dotnet=[Environment]::Version.ToString()}
    $script:phase = 'manifest'
    $command = (Receive-Line) | ConvertFrom-Json
    if ((@($command.PSObject.Properties.Name | Sort-Object) -join ',') -ne 'command,manifest,selected' -or
        $command.command -cne 'acquire') { throw 'protocol' }
    $selected = @($command.selected)
    if ($selected.Count -lt 1 -or $selected.Count -gt 3 -or @($selected | Select-Object -Unique).Count -ne $selected.Count -or
        @($selected | Where-Object { $_ -notin @('standalone.sqlite', 'wal.sqlite', 'metadata.json') }).Count -ne 0) { throw 'selection' }
    $sources = [System.IO.Path]::Combine($root, 'sources')
    $names = [System.Collections.Generic.List[string]]::new()
    foreach ($name in $selected) {
        $names.Add($name)
        if ($name.EndsWith('.sqlite')) {
            if ([System.IO.File]::Exists([System.IO.Path]::Combine($sources, "$name-journal"))) { throw 'companions' }
            $wal = [System.IO.File]::Exists([System.IO.Path]::Combine($sources, "$name-wal"))
            $shm = [System.IO.File]::Exists([System.IO.Path]::Combine($sources, "$name-shm"))
            if ($wal -ne $shm) { throw 'companions' }
            if ($wal) { $names.Add("$name-wal"); $names.Add("$name-shm") }
        }
    }
    $manifest = @($command.manifest)
    if ($names.Count -gt 5 -or $manifest.Count -ne $names.Count) { throw 'manifest' }
    $total = 0
    for ($i=0; $i -lt $manifest.Count; $i++) {
        $entry = $manifest[$i]
        if ((@($entry.PSObject.Properties.Name | Sort-Object) -join ',') -ne 'digest,name,size' -or
            $entry.name -cne $names[$i] -or $entry.size -isnot [long] -and $entry.size -isnot [int] -or
            $entry.size -lt 0 -or $entry.size -gt 131072 -or $entry.digest -cnotmatch '^[a-f0-9]{64}$') { throw 'manifest' }
        $total += $entry.size
    }
    if ($total -gt 262144) { throw 'limit' }
    $script:phase = 'open'
    foreach ($entry in $manifest) {
        $path = [System.IO.Path]::Combine($sources, $entry.name)
        [void](Check-Object $path $false)
        $reader = [System.IO.FileStream]::new($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
        $streams.Add($reader); $readers.Add($reader); $script:opened = $readers.Count
    }
    foreach ($i in 0..($manifest.Count-1)) { [void](Read-Retained $readers[$i] $manifest[$i]) }
    $script:phase = 'held'
    Integration-Frame 'handles-held'
    Integration-Command 'copy'
    $script:phase = 'copy'
    for ($i=0; $i -lt $manifest.Count; $i++) {
        $buffer = Read-Retained $readers[$i] $manifest[$i]
        foreach ($area in @('acquisition', 'analysis')) {
            $destination = [System.IO.Path]::Combine($root, 'scratch', $area, $manifest[$i].name)
            $writer = Create-File $destination
            if ($request.fault -eq 'destination-dacl') {
                Close-Stream $writer
                Extra-Rule $destination $false
                $script:fault = 'destination-descriptor'
                Verify-Security $destination $false
            }
            if ($request.fault -eq 'partial-copy') {
                $amount = [Math]::Min(16, [int]$manifest[$i].size)
                $writer.Write($buffer, 0, $amount); $writer.Flush()
                if ($amount -le 0 -or $writer.Length -ne $amount -or $writer.Position -ne $amount) { throw 'write' }
                $script:partialWritten = $true; $script:fault = 'after-partial-write'
                throw "SYNTHETIC_PRIVATE_HELPER_CANARY $root"
            }
            $writer.Write($buffer, 0, [int]$manifest[$i].size); $writer.Flush()
            [void](Read-Retained $writer $manifest[$i])
            Close-Stream $writer
            Verify-Security $destination $false
        }
    }
    Verify-IntegrationScratch $manifest
    $script:copied = $true
    $script:phase = 'analysis'
    Integration-Frame 'copies-verified'
    Integration-Command 'verify'
    $script:phase = 'verify'
    foreach ($i in 0..($manifest.Count-1)) {
        [void](Read-Retained $readers[$i] $manifest[$i])
        $destination = [System.IO.Path]::Combine($root, 'scratch', 'acquisition', $manifest[$i].name)
        $check = [System.IO.FileStream]::new($destination, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
        $streams.Add($check)
        [void](Read-Retained $check $manifest[$i]); Close-Stream $check
    }
    if ($request.fault -eq 'analysis-dacl') {
        Extra-Rule ([System.IO.Path]::Combine($root, 'scratch', 'analysis', $manifest[0].name)) $false
        $script:fault = 'analysis-descriptor'
    }
    Verify-IntegrationScratch $manifest
    if ($request.fault -eq 'diagnostic') {
        $script:fault='diagnostic'
        [Console]::Error.WriteLine("SYNTHETIC_PRIVATE_HELPER_CANARY $root S-1-5-999-invented")
        [Console]::Error.Flush(); throw "SYNTHETIC_PRIVATE_HELPER_CANARY $root"
    }
    $script:phase = 'verified'
    Integration-Frame 'verified-held'
    Integration-Command 'release'
    $script:phase = 'release'
    $script:outcome = 'ok'
}

try {
    if (-not $IsWindows -or $PSVersionTable.PSVersion.Major -ne 7) { throw 'host' }
    $request = (Receive-Line) | ConvertFrom-Json
    $integration = $request.case -eq 'integration'
    if ($integration) {
        $fileLimit = 131072
        if ((@($request.PSObject.Properties.Name | Sort-Object) -join ',') -ne 'case,fault,nonce,root' -or
            $request.fault -notin @('none', 'protected', 'root-dacl', 'destination-dacl', 'analysis-dacl', 'partial-copy', 'diagnostic')) { throw 'protocol' }
    } elseif ((@($request.PSObject.Properties.Name | Sort-Object) -join ',') -ne 'case,nonce,root' -or
        $request.case -notin @('acl', 'acl-refusal', 'reader', 'writer', 'rename', 'unlink', 'copy', 'partial',
            'fault-protected', 'fault-copy', 'fault-diagnostic')) { throw 'protocol' }
    $nonce = [Guid]::ParseExact($request.nonce, 'D').ToString()
    $root = [System.IO.Path]::GetFullPath($request.root)
    $temporary = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
    if ([System.IO.Path]::GetDirectoryName($root) -ne $temporary -or
        [System.IO.Path]::GetFileName($root) -notmatch $(if ($integration) { '^workspace-surveyor-synthetic-[A-Za-z0-9]+$' } else { '^workspace-surveyor-helper-[A-Za-z0-9]+$' }) -or
        @($root.Split('\') | Where-Object { $_ -ieq '.codex' }).Count -ne 0) { throw 'scope' }
    $rootItem = Check-Object $root $true
    $owner = [System.IO.Path]::Combine($root, 'owner')
    [void](Check-Object $owner $false)
    $entries = @([System.IO.Directory]::EnumerateFileSystemEntries($root))
    if ($entries.Count -ne 1 -or $entries[0] -ne $owner -or [System.IO.File]::ReadAllText($owner) -cne $nonce) { throw 'ownership' }
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    try { $sid = $identity.User } finally { $identity.Dispose() }
    $phase = 'root-protect'
    [System.IO.FileSystemAclExtensions]::SetAccessControl($rootItem, (New-Security $true))
    $phase = 'marker-protect'
    [System.IO.FileSystemAclExtensions]::SetAccessControl([System.IO.FileInfo]::new($owner), (New-Security $false))
    $phase = 'root-verify'
    Verify-Security $root $true
    $phase = 'marker-verify'
    Verify-Security $owner $false
    if ($integration) { Invoke-Integration; return }
    if ($request.case -eq 'fault-protected') {
        $fault = 'after-protection'
        throw "SYNTHETIC_PRIVATE_HELPER_CANARY $root"
    }
    if ($request.case -eq 'fault-diagnostic') {
        # Fault injection only: the Node wrapper must suppress this raw capture.
        [Console]::Error.WriteLine("SYNTHETIC_PRIVATE_HELPER_CANARY $root S-1-5-999-invented")
        [Console]::Error.Flush()
        $fault = 'diagnostic'
        throw "SYNTHETIC_PRIVATE_HELPER_CANARY $root"
    }
    $sources = [System.IO.Path]::Combine($root, 'sources')
    $scratch = [System.IO.Path]::Combine($root, 'scratch')
    $phase = 'fixtures'
    Create-Directory $sources
    Create-Directory $scratch
    $bytes = [System.Text.Encoding]::ASCII.GetBytes('SYNTHETIC_PRIVATE_HELPER_CANARY_INVENTED_BYTES')
    foreach ($name in @('a.bin', 'b.bin')) {
        $stream = Create-File ([System.IO.Path]::Combine($sources, $name))
        $stream.Write($bytes, 0, $bytes.Length)
        Close-Stream $stream
        Verify-Security ([System.IO.Path]::Combine($sources, $name)) $false
    }
    if ($request.case -in @('acl', 'acl-refusal')) {
        $probe = [System.IO.Path]::Combine($scratch, 'probe.bin')
        $stream = Create-File $probe
        Close-Stream $stream
        if ($request.case -eq 'acl-refusal') {
            $security = New-Security $false
            $everyone = [System.Security.Principal.SecurityIdentifier]::new([System.Security.Principal.WellKnownSidType]::WorldSid, $null)
            [void]$security.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($everyone,
                [System.Security.AccessControl.FileSystemRights]::Read, [System.Security.AccessControl.AccessControlType]::Allow))
            [System.IO.FileSystemAclExtensions]::SetAccessControl([System.IO.FileInfo]::new($probe), $security)
        }
        Verify-Security $probe $false
    }
    Send-Frame @{stage='prepared'; protected=$true; powershell=$PSVersionTable.PSVersion.ToString(); dotnet=[Environment]::Version.ToString()}
    if ((Receive-Command) -ne 'acquire') { $outcome = 'cancelled'; throw 'cancel' }
    $selected = if ($request.case -in @('copy', 'partial', 'fault-copy')) { @('a.bin', 'b.bin') } else { @('a.bin') }
    $readers = [System.Collections.Generic.List[System.IO.FileStream]]::new()
    $phase = 'open'
    foreach ($name in $selected) {
        $path = [System.IO.Path]::Combine($sources, $name)
        Verify-Security $path $false
        try {
            $reader = [System.IO.FileStream]::new($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
        } catch {
            $exception = $_.Exception
            while ($null -ne $exception.InnerException) { $exception = $exception.InnerException }
            if ($request.case -ne 'writer' -or $exception.HResult -ne -2147024864) { throw }
            Send-Frame @{stage='sharing-refused'; sharing=$true}
            # Explicit released-writer control, once; never an automatic acquisition retry.
            if ((Receive-Command) -ne 'acquire') { $outcome = 'cancelled'; throw 'cancel' }
            $reader = [System.IO.FileStream]::new($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
        }
        $streams.Add($reader); $readers.Add($reader)
    }
    # All selected handles precede any bounded read or destination creation.
    $phase = 'copy'
    for ($i = 0; $i -lt $readers.Count; $i++) {
        $reader = $readers[$i]
        if ($reader.Length -gt 4096) { throw 'limit' }
        $buffer = [byte[]]::new(4097)
        $count = 0
        do {
            $n = $reader.Read($buffer, $count, $buffer.Length - $count)
            $count += $n
        } while ($n -gt 0 -and $count -lt $buffer.Length)
        if (-not (Equal-Bytes $bytes $buffer $count)) { throw 'bytes' }
        if ($request.case -in @('copy', 'fault-copy')) {
            $destination = [System.IO.Path]::Combine($scratch, $selected[$i])
            $writer = Create-File $destination
            $writer.Write($buffer, 0, $count)
            if ($request.case -eq 'fault-copy') {
                $writer.Flush()
                if ($count -le 0 -or $count -gt 4096 -or $writer.Length -ne $count -or $writer.Position -ne $count) { throw 'write' }
                $partialWritten = $true
                $fault = 'after-partial-write'
                throw "SYNTHETIC_PRIVATE_HELPER_CANARY $root"
            }
            $writer.Flush()
            $writer.Position = 0
            $check = [byte[]]::new($count + 1)
            if (-not (Equal-Bytes $bytes $check ($writer.Read($check, 0, $check.Length)))) { throw 'bytes' }
            Close-Stream $writer
            Verify-Security $destination $false
        }
    }
    $copied = $request.case -eq 'copy'
    Send-Frame @{stage='handles-held'; read=$true}
    $phase = 'release'
    if ((Receive-Command) -ne 'release') { $outcome = 'cancelled'; throw 'cancel' }
    $outcome = 'ok'
} catch {
    # Never emit exception messages, invocation information, paths or stacks.
    $exception = $_.Exception
    while ($null -ne $exception.InnerException) { $exception = $exception.InnerException }
    $category = switch ($exception.GetType().Name) {
        'ArgumentException' { 'argument' }
        'MethodException' { 'method' }
        'PSInvalidCastException' { 'conversion' }
        'UnauthorizedAccessException' { 'access' }
        'NotSupportedException' { 'unsupported' }
        default { 'io' }
    }
    if ($exception.HResult -eq -2147024864) { $outcome = 'sharing-refused' } # ERROR_SHARING_VIOLATION, 0x80070020
} finally {
    foreach ($stream in $streams) {
        try { $stream.Dispose() } catch { $closed = $false }
    }
    if ($integration) {
        Send-Frame @{stage='finished'; run=$nonce; outcome=$outcome; closed=$closed; copied=$copied; phase=$phase;
            fault=$fault; partialWritten=$partialWritten; opened=$opened}
    } else {
        Send-Frame @{stage='finished'; outcome=$outcome; closed=$closed; copied=$copied; phase=$phase; category=$category;
            fault=$fault; partialWritten=$partialWritten}
    }
}
