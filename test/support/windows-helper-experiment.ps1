# M2a.3 only: disposable invented files, supported managed APIs, no acquisition integration.
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
    if (-not $directory -and $item.Length -gt 4096) { throw 'limit' }
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

try {
    if (-not $IsWindows -or $PSVersionTable.PSVersion.Major -ne 7) { throw 'host' }
    $request = (Receive-Line) | ConvertFrom-Json
    if ((@($request.PSObject.Properties.Name | Sort-Object) -join ',') -ne 'case,nonce,root' -or
        $request.case -notin @('acl', 'acl-refusal', 'reader', 'writer', 'rename', 'unlink', 'copy', 'partial',
            'fault-protected', 'fault-copy', 'fault-diagnostic')) { throw 'protocol' }
    $nonce = [Guid]::ParseExact($request.nonce, 'D').ToString()
    $root = [System.IO.Path]::GetFullPath($request.root)
    $temporary = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
    if ([System.IO.Path]::GetDirectoryName($root) -ne $temporary -or
        [System.IO.Path]::GetFileName($root) -notmatch '^workspace-surveyor-helper-[A-Za-z0-9]+$' -or
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
    Send-Frame @{stage='finished'; outcome=$outcome; closed=$closed; copied=$copied; phase=$phase; category=$category;
        fault=$fault; partialWritten=$partialWritten}
}
