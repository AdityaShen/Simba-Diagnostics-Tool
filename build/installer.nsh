!include "MUI2.nsh"

Section "Install Python"
  SetOutPath "$INSTDIR\python"
  ExecWait '"$INSTDIR\resources\python\win\python.exe" -m ensurepip'
  ExecWait '"$INSTDIR\resources\python\win\python.exe" -m pip install -r "$INSTDIR\resources\python\win\requirements.txt"'
SectionEnd

Section "Install ADB"
  SetOutPath "$INSTDIR\adb"
SectionEnd


