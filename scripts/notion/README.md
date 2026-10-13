# Usage

## Table of Contents

1. [Authorize](#authorize)
2. [Select Database for Upload](#select-database-for-upload)
3. [Remove Authorize](#remove-authorize)
4. [Uploading](#uploading)
5. [Auto upload](#auto-upload)

## Authorize

- Click the `Authorize` button on the popup page to grant access to Notion.

  ![Click authorize button](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/41121d8e-4bcc-472c-85fa-88a081de2cfe)

- On the notion page, click select page button.

  ![Click select page](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/b563f114-9f41-40a5-a39b-2fdb597e69bb)

- Select the page on which the database you want to upload the source code from, and then click the Allow Access button.

  ![Access notion authorize](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/7071faa9-e001-4c9d-acc8-a629a26fe347)

- Once authorized, the window will redirect github and close automatically.
- Check if the status color has turned green and if the authorize button has changed to a remove button.

  ![Check authorize result](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/032f341f-7f93-40d2-8bf0-578cccd87972)

## Select database for upload

- Press the `Select Database` tag. It will then import and show the database list of the page you gave permission to.

  ![Press upload database](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/61bbb724-589e-44bb-ae3d-9e08b0872b9b)

- Select the database to upload from the database list.

  ![Select database to upload](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/cd8144ef-64c1-4cd0-a535-7d8fcee70922)

- Check the database to upload.

  ![Check database to upload](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/d4d68513-38c0-489d-aad8-550b22691c91)

## Remove authorize

- Click the `Remove` button on the popup page.

  ![Remove authorize](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/93218837-e87e-49d2-aaa2-2ab373c9c8d8)

## Uploading

- Open a problem on [Programmers](https://school.programmers.co.kr/) and write your solution.
- Click the Notion icon button at the top right of the code editor.
- A page with the problem title, level and tags as properties and the source code as a code block is created in the selected database.
- If the problem has already been uploaded, the source code of that page is replaced instead of creating a new page. If the source code is the same, nothing is changed and a message says so.
- If the upload is successful, a message with an `Open` link to the Notion page is shown at the bottom right of the page.
- If an error occurs, the cause of the error is shown in the message.

## Auto upload

- Turn on the auto upload switch of Notion on the popup page.
- When the result of `제출 후 채점하기` is `정답`, the source code is uploaded without clicking the button.
