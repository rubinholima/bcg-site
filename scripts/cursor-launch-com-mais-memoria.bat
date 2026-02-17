@echo off
REM Abre o Cursor com limite de heap Node aumentado (reduz OOM).
REM Nao passa pasta para nao abrir janela "nova" e nao perder o chat (Cursor restaura a ultima sessao).
REM Ajuste HEAP_MB se quiser mais (ex: 16384 = 16GB).

set HEAP_MB=16384
set NODE_OPTIONS=--max-old-space-size=%HEAP_MB%

REM Se o script nao achar o Cursor, descomente e cole o caminho do Cursor.exe:
set "CURSOR_EXE=C:\Program Files\cursor\Cursor.exe"

REM Para abrir direto numa pasta (pode fazer o chat "sumir" nessa janela), descomente a linha abaixo e ajuste o caminho:
REM set "PROJETO=e:\DEV\BCG SITE"

if defined PROJETO (
  start "" "%CURSOR_EXE%" "%PROJETO%"
) else (
  start "" "%CURSOR_EXE%"
)
exit /b 0
