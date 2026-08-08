import os

def get_autostart_dir():
    config_home = os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config"))
    return os.path.join(config_home, "autostart")

def get_autostart_filepath():
    return os.path.join(get_autostart_dir(), "kanban-notes-desktop.desktop")

def get_autostart_status():
    return os.path.exists(get_autostart_filepath())

def set_autostart_status(enable):
    autostart_dir = get_autostart_dir()
    desktop_file = get_autostart_filepath()

    if enable:
        if not os.path.exists(autostart_dir):
            os.makedirs(autostart_dir, exist_ok=True)

        exec_cmd = "/usr/bin/kanban-notes-desktop"
        if not os.path.exists(exec_cmd):
            exec_cmd = f"python3 {os.path.join(os.path.dirname(os.path.abspath(__file__)), 'main.py')}"

        content = f"""[Desktop Entry]
Type=Application
Version=1.0
Name=Kanban Notes Desktop
Comment=Catatan Kanban & Productivity Suite Desktop
Exec={exec_cmd}
Icon=kanban-notes-desktop
Terminal=false
Categories=Utility;Office;
X-GNOME-Autostart-enabled=true
"""
        with open(desktop_file, "w", encoding="utf-8") as f:
            f.write(content)
    else:
        if os.path.exists(desktop_file):
            os.remove(desktop_file)
    return True
