SETUP (once)
1. Make a PUBLIC GitHub repo and upload everything in this folder (including the hidden .gitattributes).
2. Open "Zyro Games.bat" in Notepad, find  $script:updateUrl  near the top and set it to
   https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-REPO/main
   Then copy that edited file over launcher.bat in this folder and run "Publish update.bat".
3. Give players the edited Zyro Games.bat. They press UPDATE in Settings from then on.

EACH UPDATE
Change files in game\ (or replace launcher.bat), run "Publish update.bat", done.
GitHub may take ~5 minutes to show new files.
