# Session-only local rendezvous. No source, recovery or persistent store access.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false, $true)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$pipe = $null
$phase = 'input'
$parentReader = [IO.StreamReader]::new([Console]::OpenStandardInput(), [Text.UTF8Encoding]::new($false, $true), $false, 1024)
function Emit($value) { [Console]::WriteLine(($value | ConvertTo-Json -Compress)) }
function Input-Message($task) {
    if (-not $task.Wait(5000)) { throw 'deadline' }
    $line = $task.GetAwaiter().GetResult()
    if ($null -eq $line -or $line.Length -gt 1024) { throw 'input' }
    return ($line | ConvertFrom-Json)
}
function Read-Bytes($stream, [int]$count) {
    $bytes = [byte[]]::new($count)
    $cancel = [Threading.CancellationTokenSource]::new(5000)
    try {
        $offset = 0
        while ($offset -lt $count) {
            $read = $stream.ReadAsync($bytes, $offset, $count - $offset, $cancel.Token).GetAwaiter().GetResult()
            if ($read -eq 0) { throw 'eof' }
            $offset += $read
        }
        return ,$bytes
    } finally { $cancel.Dispose() }
}
function Receive($stream) {
    $length = [BitConverter]::ToInt32((Read-Bytes $stream 4), 0)
    if ($length -lt 1 -or $length -gt 1024) { throw 'size' }
    return ([Text.UTF8Encoding]::new($false, $true).GetString((Read-Bytes $stream $length)) | ConvertFrom-Json)
}
function Send($stream, $value) {
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($value | ConvertTo-Json -Compress))
    if ($bytes.Length -gt 1024) { throw 'size' }
    $cancel = [Threading.CancellationTokenSource]::new(5000)
    try {
        $prefix = [BitConverter]::GetBytes([int]$bytes.Length)
        $null = $stream.WriteAsync($prefix, 0, 4, $cancel.Token).GetAwaiter().GetResult()
        $null = $stream.WriteAsync($bytes, 0, $bytes.Length, $cancel.Token).GetAwaiter().GetResult()
        $stream.Flush()
    } finally { $cancel.Dispose() }
}
function Valid-Url($value) { return $value -is [string] -and $value -cmatch '^http://127\.0\.0\.1:[0-9]{1,5}/#[a-f0-9]{64}$' }
function Shape($value, [string]$keys) { return $null -ne $value -and (($value.psobject.Properties.Name | Sort-Object) -join ',') -ceq $keys }
function Version-One($value) { return $value -is [long] -and $value -eq 1 }
try {
    $request = Input-Message ($parentReader.ReadLineAsync())
    if (-not (Shape $request 'channel,scope,version') -or -not (Version-One $request.version) -or $request.scope -isnot [string] -or $request.scope -cnotmatch '^[a-f0-9]{64}$' -or $request.channel -isnot [string] -or
        $request.channel -cnotmatch '^(main|[a-f0-9]{64})$') { throw 'input' }
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($sid))).ToLowerInvariant()
    $name = 'WorkspaceSurveyor.Session.v1.' + $hash + '.' + $request.channel
    $options = [IO.Pipes.PipeOptions]::Asynchronous -bor [IO.Pipes.PipeOptions]::CurrentUserOnly -bor [IO.Pipes.PipeOptions]::FirstPipeInstance
    try { $pipe = [IO.Pipes.NamedPipeServerStream]::new($name, [IO.Pipes.PipeDirection]::InOut, 1, [IO.Pipes.PipeTransmissionMode]::Byte, $options) }
    catch {
        # One connection attempt. Never create another host after ambiguity.
        $phase = 'client-create'
        $pipe = [IO.Pipes.NamedPipeClientStream]::new('.', $name, [IO.Pipes.PipeDirection]::InOut,
            ([IO.Pipes.PipeOptions]::Asynchronous -bor [IO.Pipes.PipeOptions]::CurrentUserOnly))
        $phase = 'connect'
        $pipe.Connect(5000)
        $phase = 'response'
        Send $pipe @{ version = 1; scope = $request.scope }
        $reply = Receive $pipe
        if (-not (Shape $reply 'event,url,version') -or -not (Version-One $reply.version) -or $reply.event -ne 'attached' -or -not (Valid-Url $reply.url)) { throw 'refused' }
        Emit @{ event = 'attached'; url = $reply.url }
        exit 0
    }
    Emit @{ event = 'owner' }
    $ready = Input-Message ($parentReader.ReadLineAsync())
    if (-not (Shape $ready 'event,url') -or $ready.event -ne 'ready' -or -not (Valid-Url $ready.url)) { throw 'ready' }
    Emit @{ event = 'ready' }
    $parentRead = $parentReader.ReadLineAsync()
    while ($true) {
        $phase = 'accept'
        $connection = $pipe.WaitForConnectionAsync()
        $winner = [Threading.Tasks.Task]::WaitAny([Threading.Tasks.Task[]]@($parentRead, $connection))
        if ($winner -eq 0) { break } # EOF, stop, or unexpected input all end ownership.
        $null = $connection.GetAwaiter().GetResult()
        try {
            $phase = 'receive'
            $incoming = Receive $pipe
            if (-not (Shape $incoming 'scope,version') -or -not (Version-One $incoming.version) -or $incoming.scope -isnot [string] -or $incoming.scope -cne $request.scope) {
                Send $pipe @{ version = 1; event = 'refused' }
            } else {
                Emit @{ event = 'relaunch' }
                $response = Input-Message $parentRead
                $parentRead = $parentReader.ReadLineAsync()
                if (-not (Shape $response 'event,url') -or $response.event -ne 'reply' -or -not (Valid-Url $response.url)) { throw 'reply' }
                Send $pipe @{ version = 1; event = 'attached'; url = $response.url }
            }
        } catch {
            # A malformed/slow client cannot release ownership or expose the URL.
        } finally {
            # IsConnected is false after a mid-reply disconnect, but the stream
            # still needs Disconnect before another WaitForConnectionAsync.
            $phase = 'disconnect'
            $pipe.Disconnect()
        }
    }
} catch { Emit @{ event = 'refused'; phase = $phase }; exit 1 }
finally { if ($null -ne $pipe) { $pipe.Dispose() }; $parentReader.Dispose() }
