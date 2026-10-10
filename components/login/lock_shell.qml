import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Services.Pam

ShellRoot {
    id: shellRoot

    property string activeTheme: Quickshell.env("QS_THEME") || "netwatch"
    property string themePath: Quickshell.env("QS_THEME_PATH") || (Quickshell.shellDir + "/themes/" + activeTheme)

    readonly property string currentUser: Quickshell.env("USER") || "V"
    readonly property bool isWayland: Quickshell.env("XDG_SESSION_TYPE") === "wayland"
    property bool emergencyMode: false
    property bool lockSecure: false
    property bool authenticated: false
    property bool sessionLocked: true
    property bool isTesting: Quickshell.env("QS_TESTING") === "1"

    signal loginOK()
    signal loginFail()

    // A failed/broken theme can always be replaced without releasing the lock.
    Shortcut {
        sequence: "Ctrl+Alt+F"
        onActivated: shellRoot.emergencyMode = true
    }
    IpcHandler {
        target: "lock"
        function secure(): bool { return shellRoot.lockSecure }
    }

    function doAuth(user, pass) {
        if (shellRoot.authenticated) return
        if (pam.active) {
            if (pam.responseRequired) pam.respond(pass)
            return
        }
        // Only the session owner can authenticate, regardless of theme input.
        pam.user = currentUser
        pam.pendingPassword = pass
        pam.hasPendingPassword = true
        if (!pam.start()) {
            pam.pendingPassword = ""
            pam.hasPendingPassword = false
            shellRoot.loginFail()
        }
    }

    PamContext {
        config: Quickshell.env("QS_PAM_CONFIG") || "login"
        id: pam
        property string pendingPassword: ""
        property bool hasPendingPassword: false

        onResponseRequiredChanged: {
            if (!responseRequired) return
            if (responseVisible) {
                respond(shellRoot.currentUser)
            } else if (hasPendingPassword) {
                const response = pendingPassword
                pendingPassword = ""
                hasPendingPassword = false
                respond(response)
            } else {
                // Additional challenges (e.g. OTP) need an editable prompt.
                shellRoot.emergencyMode = true
            }
        }

        onCompleted: (result) => {
            pendingPassword = ""
            hasPendingPassword = false
            if (result === PamResult.Success) {
                shellRoot.authenticated = true
                shellRoot.loginOK()
                Quickshell.execDetached(["loginctl", "unlock-session"])

                let delay = 100
                if (activeTheme.includes("clockwork")) delay = 500
                quitTimer.interval = delay
                quitTimer.start()
            } else {
                shellRoot.loginFail()
            }
        }
    }

    Timer {
        id: quitTimer
        interval: 3000
        onTriggered: {
            shellRoot.sessionLocked = false
            Qt.quit()
        }
    }

    // This UI deliberately uses only QtQuick so broken theme/media imports cannot
    // remove the password entry from an already acquired session lock.
    Component {
        id: emergencyAuth
        Rectangle {
            color: "#101018"
            Column {
                anchors.centerIn: parent
                spacing: 20
                Text { text: "Unlock session"; color: "white"; font.pixelSize: 28 }
                Rectangle {
                    width: 360; height: 52; color: "#303040"
                    TextInput {
                        id: password
                        anchors.fill: parent; anchors.margins: 12
                        color: "white"; echoMode: TextInput.Password; focus: true
                        enabled: !pam.active || pam.responseRequired
                        onAccepted: { shellRoot.doAuth(shellRoot.currentUser, text); text = "" }
                    }
                }
                Text { id: feedback; text: pam.active ? pam.message : "Enter your password and press Enter"; color: "white"; width: 360; wrapMode: Text.Wrap }
                Connections {
                    target: shellRoot
                    function onLoginFail() { feedback.text = "Authentication failed. Try again."; password.forceActiveFocus() }
                }
            }
            Component.onCompleted: password.forceActiveFocus()
        }
    }

    Component {
        id: themeComponent
        Loader {
            anchors.fill: parent
            source: shellRoot.emergencyMode ? "" : "file://" + shellRoot.themePath + "/Main.qml"
            sourceComponent: shellRoot.emergencyMode ? emergencyAuth : undefined

            onLoaded: {
                item.forceActiveFocus()
            }
            onStatusChanged: {
                if (status === Loader.Error) {
                    console.error("FAILED to load theme:", source)
                    shellRoot.emergencyMode = true
                }
            }
        }
    }

    Loader {
        id: waylandLoader
        active: shellRoot.isWayland
        sourceComponent: Component {
            WlSessionLock {
                id: lock
                locked: shellRoot.sessionLocked
                onSecureChanged: {
                    shellRoot.lockSecure = secure
                    if (secure) console.info("Session lock confirmed by compositor")
                }
                surface: Component {
                    WlSessionLockSurface {
                        color: "black"

                        PinchHandler { target: null }
                        WheelHandler { target: null }

                        MouseArea {
                            anchors.fill: parent
                            acceptedButtons: Qt.AllButtons
                            hoverEnabled: true
                            onWheel: (wheel) => { wheel.accepted = true }
                        }

                        Loader {
                            anchors.fill: parent
                            sourceComponent: themeComponent
                        }
                    }
                }
            }
        }
    }

}
