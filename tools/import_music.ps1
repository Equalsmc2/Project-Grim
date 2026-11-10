param([Parameter(Mandatory=$true)][string]$ArchivesFolder)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'assets\music\import-manifest.json'
if(-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'Missing import manifest; extract the complete website ZIP first.' }
$sourceDir = (Resolve-Path -LiteralPath $ArchivesFolder).ProviderPath
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
Add-Type -AssemblyName System.IO.Compression
$done = 0; $missing = 0; $importedBytes = [long]0
$archives = @(Get-ChildItem -LiteralPath $sourceDir -Filter '*.zip' -File)
foreach($album in $manifest.albums){
 # Accept browser download suffixes like (1)/(3) and URL-escaped spaces.
 $wanted = [IO.Path]::GetFileNameWithoutExtension([string]$album.originalArchive)
 $zipFile = $null
 foreach($candidate in $archives){
  $normalized = [uri]::UnescapeDataString([string]$candidate.BaseName) -replace '\(\d+\)$',''
  if($normalized -eq $wanted){$zipFile = $candidate.FullName;break}
 }
 if($null -eq $zipFile -or -not (Test-Path -LiteralPath $zipFile -PathType Leaf)){
   Write-Host ('[MISSING ARCHIVE] '+$album.originalArchive) -ForegroundColor Yellow
   $missing += [int]$album.expectedTracks
   continue
 }
 Write-Host ('Installing '+$album.name+'...')
 $zip = [System.IO.Compression.ZipFile]::OpenRead($zipFile)
 try {
   $entryMap = @{}
   foreach($entry in $zip.Entries){$entryMap[$entry.FullName]=$entry}
   foreach($track in ($manifest.tracks | Where-Object {$_.album -eq $album.id})) {
    $rel = [string]$track.file
    # Only permit the fixed, generated asset path. Never trust archive paths as output paths.
    if($rel -notmatch '^assets/music/[a-z-]+/[a-z0-9-]+\.mp3$'){throw ('Unsafe output path: '+$rel)}
    $entry = $entryMap[[string]$track.sourceEntry]
    if($null -eq $entry){Write-Warning ('Archive is missing: '+$track.sourceEntry);$missing++;continue}
    if([long]$entry.Length -ne [long]$track.bytes){throw ('Archive changed: '+$entry.FullName)}
    $destination = Join-Path $root ($rel.Replace('/',[IO.Path]::DirectorySeparatorChar))
    $parent = Split-Path -Parent $destination
    [System.IO.Directory]::CreateDirectory($parent) | Out-Null
    if(Test-Path -LiteralPath $destination){
      if((Get-Item -LiteralPath $destination).Length -eq $entry.Length){$done++;continue}
    }
    $source = $entry.Open()
    $temp = $destination+'.partial'
    try {
      $target = [System.IO.File]::Open($temp,[System.IO.FileMode]::Create,[System.IO.FileAccess]::Write)
      try {$source.CopyTo($target)} finally {$target.Dispose()}
      Move-Item -LiteralPath $temp -Destination $destination -Force
    } finally {$source.Dispose();if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}}
    $importedBytes += [long]$entry.Length
    $done++
   }
 } finally {$zip.Dispose()}
}
Write-Host ("Installed/verified {0} of {1} tracks; {2} missing. Copied {3:N1} MB." -f $done,$manifest.tracks.Count,$missing,($importedBytes/1MB))
Write-Host 'These are LOCAL music files. Keep them out of public source control and hosting unless you have distribution rights.'
if($done -eq 0){exit 2}
