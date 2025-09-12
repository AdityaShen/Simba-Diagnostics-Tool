
import subprocess
import time
import pychrome
import json
import sys

def run_adb_command(command, device_id=None):
    cmd = ["adb"]
    if device_id:
        cmd += ["-s", device_id]
    cmd += command
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip()

def open_chrome(url, device_id=None):
    cmd = ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url, "com.android.chrome"]
    output = run_adb_command(cmd, device_id)
    print(output)

def start_har_tracing(url, har_filename="chrome_har_output.json", capture_time=20, device_id=None):
    open_chrome(url, device_id)
    time.sleep(2)
    run_adb_command(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"], device_id)
    time.sleep(1)

    browser = pychrome.Browser(url="http://127.0.0.1:9222")
    tabs = browser.list_tab()
    if not tabs:
        print("No Chrome tabs found.")
        return
    tab = tabs[0]
    tab.start()
    tab.Network.enable()
    har = {"log": {"entries": []}}

    def request_will_be_sent(**kwargs):
        har["log"]["entries"].append(kwargs)

    tab.Network.requestWillBeSent = request_will_be_sent

    import signal
    import threading
    stop_event = threading.Event()

    def handle_sigterm(signum, frame):
        print(f"[HAR TRACE] SIGTERM received, stopping HAR trace and saving file...")
        stop_event.set()

    signal.signal(signal.SIGTERM, handle_sigterm)

    def stdin_listener():
        print("[HAR TRACE] stdin listener thread started.")
        while not stop_event.is_set():
            try:
                line = sys.stdin.readline()
                if line:
                    print(f"[HAR TRACE] Received from stdin: {line.strip()}")
                    if line.strip() == "STOP":
                        print("[HAR TRACE] STOP command received via stdin.")
                        stop_event.set()
                        break
            except Exception as e:
                print(f"[HAR TRACE] Exception in stdin listener: {e}")
                break

    def timer_thread():
        print(f"[HAR TRACE] Timer thread started for {capture_time} seconds.")
        time.sleep(capture_time)
        print("[HAR TRACE] Timer expired, stopping trace.")
        stop_event.set()

    t_timer = threading.Thread(target=timer_thread)
    t_stdin = threading.Thread(target=stdin_listener)
    t_timer.start()
    t_stdin.start()

    print(f"HAR tracing started for up to {capture_time} seconds. Interact with the page. Use Stop button to end early.")
    try:
        while not stop_event.is_set():
            time.sleep(1)
    except KeyboardInterrupt:
        print("KeyboardInterrupt received, stopping HAR trace...")
        stop_event.set()

    tab.stop()
    # Removed '[HAR TRACE] Stopping trace and saving to ...' message
    try:
        with open(har_filename, "w", encoding="utf-8") as f:
            json.dump(har, f, indent=2)
            f.flush()
        print(f"[HAR TRACE] HAR file saved: {har_filename}")
    except Exception as e:
        import traceback
        print(f"[HAR TRACE] ERROR saving HAR file: {e}")
        traceback.print_exc()
    print("You can now download or move this file to your local machine.")
    sys.exit(0)

if __name__ == "__main__":
    import os
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.google.com"
    har_filename = sys.argv[2] if len(sys.argv) > 2 else "chrome_har_output.har"
    capture_time = int(sys.argv[3]) if len(sys.argv) > 3 else 100
    device_id = sys.argv[4] if len(sys.argv) > 4 else None
    # Always save to output/har_files/
    har_dir = os.path.join(os.getcwd(), "output", "har_files")
    os.makedirs(har_dir, exist_ok=True)
    har_filename = os.path.join(har_dir, os.path.basename(har_filename))
    start_har_tracing(url, har_filename, capture_time, device_id)