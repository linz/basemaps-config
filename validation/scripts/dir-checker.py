import os
import tkinter as tk
from tkinter import filedialog


def get_dir() -> str | None:
    # Create a root window and hide it (we don't need the window to show)
    root = tk.Tk()
    root.withdraw()

    # Open a directory selection dialog
    directory = filedialog.askdirectory(title="Select a directory")

    # If the user cancels, the directory will be an empty string
    if directory:
        return directory

    print("No directory selected.")
    return None


def has_subdirs(dir: str) -> bool:
    # Define the required subdirectories
    subdirs = ["fonts", "sprites", "style"]

    # Check if the required subdirectories exist in the given directory
    missing_subdirs = [
        subdir
        for subdir in subdirs
        if not os.path.isdir(os.path.join(dir, subdir))
    ]

    if missing_subdirs:
        print(
            f"The following required subdirectories are missing: {', '.join(missing_subdirs)}"
        )
        return False

    return True


if __name__ == "__main__":
    dir = get_dir()

    if dir is None:
        exit(1)

    if has_subdirs(dir) is False:
        exit(1)

    exit(0)
