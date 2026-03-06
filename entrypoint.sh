#!/bin/bash
ENABLE_VNC=${ENABLE_VNC:-false}
clean() {
  if [ -n "$XVFB_PID" ]; then
    kill -TERM "$XVFB_PID"
  fi
  if [ -n "$X11VNC_PID" ]; then
    kill -TERM "$X11VNC_PID"
  fi
  if [ -n "$BROWSERSERVER_PID" ]; then
    kill -TERM "$BROWSERSERVER_PID"
  fi
}

trap clean SIGINT SIGTERM

if [ ${ENABLE_VNC} == true ]; then

    SCREEN_RESOLUTION=${SCREEN_RESOLUTION:-1920x1080x24}
    DISPLAY_NUM=99
    export DISPLAY=:${DISPLAY_NUM}

    /usr/bin/xvfb-run -l -n ${DISPLAY_NUM} -s "-ac -screen 0 ${SCREEN_RESOLUTION} -noreset -listen tcp" /usr/bin/fluxbox -display ${DISPLAY} >/dev/null 2>&1 &
    XVFB_PID=$!

    retcode=1
    until [ $retcode -eq 0 ]; do
        wmctrl -m >/dev/null 2>&1
        retcode=$?
        if [ $retcode -ne 0 ]; then
            echo Waiting X server...
            sleep 0.1
        fi
    done

    x11vnc -display ${DISPLAY} -passwd selenoid -shared -forever -loop500 -rfbport 5900 -rfbportv6 5900 >/dev/null 2>&1 &
    X11VNC_PID=$!
fi

/usr/bin/browserserver -browser chromium &
BROWSERSERVER_PID=$!

cd /home/pwuser && npm start

wait