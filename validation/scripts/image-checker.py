import json
from os import listdir
from tkinter import filedialog, Tk
from typing import Any


def select_style_json() -> str:
    file_path = filedialog.askopenfilename(
        title="Select style json (e.g. style/aerialhybrid.json)",
        filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
    )

    if not file_path:
        print("No file selected. Exiting.")
        exit(1)

    return file_path


def select_sprite_dir():
    dir_path = filedialog.askdirectory(
        title="Select sprites directory (e.g. sprites/topographic)"
    )

    if not dir_path:
        print("No directory selected. Exiting.")
        exit(1)

    return dir_path


def extract_icon_image_names(style_json_path: dict[str, str]) -> set[str]:
    image_names: set[str] = set()
        
    try:
        with open(style_json_path, "r") as file:
            data = json.load(file)

            if type(data) is not dict:
                print("Data is not dict. Exiting.")
                exit(1)

            layers = data.get("layers")

            if type(layers) is not list:
                print("Layers is not list. Exiting.")
                exit(1)

            for layer in layers:
                if type(layer) is not dict:
                    print("Layer is not dict. Exiting.")
                    exit(1)

                layout = layer.get("layout")

                if layout is None:
                    # print("Layout is None. Continuing.")
                    continue

                if type(layout) is not dict:
                    print("Layout is not dict. Exiting.")
                    exit(1)

                icon_image = layout.get("icon-image")

                if icon_image is None:
                    # print("Icon image is None. Continuing.")
                    continue

                if type(icon_image) is str:
                    image_names.add(icon_image)
                    continue

                if type(icon_image) is not dict:
                    print("Icon image is not dict or str. Exiting.")
                    exit(1)

                stops = icon_image.get("stops")

                if stops is None:
                    print("Stops is None. Exiting.")
                    exit(1)

                if type(stops) is not list:
                    print("Stops is not list. Exiting.")
                    exit(1)

                for stop in stops:
                    if type(stop) is not list:
                        print("Stop is not list. Exiting.")
                        exit(1)

                    if len(stop) != 2:
                        print("Stop is not tuple. Exiting.")
                        exit(1)

                    image_name = stop[1]

                    if type(image_name) is not str:
                        print("Image name is not str. Exiting.")
                        exit(1)

                    image_names.add(image_name)

            # print(f"Loaded JSON data from {style_json_path}:")
            # print(json.dumps(data, indent=4))
    except Exception as e:
        print(f"Failed to load style json: {e}")
        exit(1)
        
    return image_names


def check_icon_image_names_in_sprites_dr(icon_image_names: set[str], sprites_dir_path: str) -> bool:
    files_in_dir: set[str] = set(listdir(sprites_dir_path))

    missing_files: set[str] = set()

    for name in icon_image_names:
        if not any(file.startswith(name) for file in files_in_dir):
            missing_files.add(name)

    if len(missing_files) > 0:
        print("missing_files")

        for i, missing in enumerate(sorted(missing_files)):
            print(i + 1, missing)

        return False
    else:
        print('no missing files')

    return True
        
    



def main():
    root = Tk()
    root.withdraw()

    style_json_path: str = select_style_json()
    icon_image_names: set[str] = extract_icon_image_names(style_json_path)
    
    # print(sorted(icon_image_names))

    sprites_dir_path: str = select_sprite_dir()
    succeeded: bool = check_icon_image_names_in_sprites_dr(icon_image_names, sprites_dir_path)

    exit(0)


if __name__ == "__main__":
    main()
