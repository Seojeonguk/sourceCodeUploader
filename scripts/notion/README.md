# Usage

## Table of Contents

1. [Prepare the database](#prepare-the-database)
2. [Authorize](#authorize)
3. [Select Database for Upload](#select-database-for-upload)
4. [Remove Authorize](#remove-authorize)
5. [Uploading](#uploading)

## Prepare the database

Create a Notion database with the properties below before you authorize. The names are case-sensitive and must match exactly; otherwise Notion rejects the upload.

| Property | Type         | Value                                                                       |
| -------- | ------------ | --------------------------------------------------------------------------- |
| (title)  | Title        | The problem title. The title property can have any name.                    |
| `info`   | Multi-select | The platform, level and problem ID, such as `Programmers`, `Lv. 2`, `42586` |
| `tags`   | Multi-select | The categories of the problem from the breadcrumb                           |
| `URL`    | URL          | The problem URL. Used to find a problem that was already uploaded.          |
| `Date`   | Date         | The date of the last upload                                                 |
| `mime`   | Select       | The file extension of the source code, such as `py`                         |

- Select and multi-select options are added by Notion automatically, so you do not need to create them.
- Other properties are left as they are, so you can add your own, such as a status or notes.
- The page body has a `How to resolve?` heading for your notes and a `Source Code` heading with the code block. When the same problem is uploaded again, only the code block below `Source Code` and the `Date` and `mime` properties are changed.

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

- Click on the programming language for the source code you want to upload on the submission status page.

  ![Move source code page](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/33146007-7eac-41d7-bfb2-97b51b60a9e4)

- Click on the notion icon button to upload the source code.

  ![Click notion icon button](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/10582032-ce0b-47ba-a14e-c572203da943)

- If the commit is successful, the commit address will be displayed.

  ![Show successful result](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/8b424dc2-7e12-4443-b4d0-446ab5a31178)

- If an error occurs, the cause of the error will be displayed.

  ![Show error](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/18cdfeda-f63f-45f5-9bdf-31a28c0d7cd4)

- Navigate to the upload address or go to the database to verify the uploading.

  ![Check notion uploading](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/f1570c09-cb85-4a29-8ac4-ef8a42f00cae)
