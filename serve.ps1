# Simple PowerShell static web server for DRTextWeb
# Usage: powershell -ExecutionPolicy Bypass -File serve.ps1

$port = 8080
$root = (Get-Location).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port/"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $path = $request.Url.LocalPath.TrimStart('/')
        if ($path -eq '') { $path = 'index.html' }
        $file = Join-Path $root $path
        if (Test-Path $file) {
            $bytes = [System.IO.File]::ReadAllBytes($file)
            switch -regex ($file) {
                ".*\.html$" { $response.ContentType = "text/html" }
                ".*\.js$"   { $response.ContentType = "application/javascript" }
                ".*\.css$"  { $response.ContentType = "text/css" }
                ".*\.json$" { $response.ContentType = "application/json" }
                ".*\.png$"  { $response.ContentType = "image/png" }
                ".*\.jpg$"  { $response.ContentType = "image/jpeg" }
                ".*\.svg$"  { $response.ContentType = "image/svg+xml" }
                ".*\.webp$" { $response.ContentType = "image/webp" }
                default       { $response.ContentType = "application/octet-stream" }
            }
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    } catch {
        Write-Host $_
    }
}
