# AutoUpload

Unofficial automatic upload.

- Plugin to BOJ scoring status
- Automatically upload the source code to Notion.

# Prerequisites

## Settings

You have to create a .env file in the Python folder.
(token_v2 can be found in cookies using the developer tool (F12) after accessing the Notion page.)

```
notion_token=your_notion_token_v2
notion_url=your_notion_url
```

## Installing Python

The Python version that I checked for operation is 3.9.7 version.

Make sure that you have Python3 installed on your machine.

You might want to use venv standard Python library to create virtual environments and have Python, pip and all dependent packages to be installed and served from the local project directory to avoid messing with system wide packages and their versions.

Depending on your installation you might have access to Python3 interpreter either by running `python` or `python3`. The same goes for pip package manager - it may be accessible either by running `pip` or `pip3`.

You may check your Python version by running:

`python --version`

Note that in this repository whenever you see `python` it will be assumed that it is Python 3.

## Installing dependencies

Install all dependencies that are required for the project by running:

`pip install -r requirements.txt`

or

```
pip install notion
pip install watchdog
pip install dotenv
```

## Activating the chromium extension

Enter `chrome://extensions` to access, or press `Manage Extension` at the bottom of the extension management button to access.

![image](https://user-images.githubusercontent.com/44386047/151270761-33642452-23ec-49d8-ad1e-f89f06361b7b.png)

After activating the developer mode in the upper right corner, click "Load the uncompressed extension" to upload the file.
![image](https://user-images.githubusercontent.com/44386047/151270848-92ab5190-b237-4d2d-a4cc-bc9bac8bb9fe.png)

# Run

1. run `main.py` in the Python folder.
   It detects a change event on the desktop.

2. Upload the source code of the problem through the upload button generated through plug-in installation.
   Note that the upload button is activated only for correct problems.
   ![image](https://user-images.githubusercontent.com/44386047/151271158-072e9250-802b-4b4d-9b46-8203a8e5a43e.png)
