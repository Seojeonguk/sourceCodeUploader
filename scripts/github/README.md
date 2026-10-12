# Usage

## Table of Contents

1. [Authorize](#authorize)
2. [Select Repository for Upload](#select-repository-for-upload)
3. [Remove Authorize](#remove-authorize)
4. [Commit](#commit)

## Authorize

- Click the `Authorize` button on the popup page. A login page opens with a code.
- Click `Open GitHub` (the code is copied as well), paste the code on GitHub and authorize Source Code Uploader.
- The login page shows that you are logged in and closes automatically.
- Check if the status color has turned green and if the authorize button has changed to a remove button.

  ![Check authorize result](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/7a48b831-c3df-4abc-9a91-d930f4d48470)

The extension logs in with the GitHub [device flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow), which needs only the client ID, so no client secret is shipped in the extension. **Enable Device Flow** must be turned on in the settings of the GitHub OAuth App.

## Select Repository for Upload

- Press the `Select Repository` tag.

  ![Select upload repository](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/b393ad46-016b-41ae-8508-d4121503ac35)

- Select the repository to upload from the repository list.

  ![Select repository to upload](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/d193d422-fe9b-4364-a446-09727c87ec42)

- Check the repository to upload.

  ![Check repository to upload](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/33c9406e-6eec-4cd3-ad56-06b097245538)

## Remove authorize

- Click the `Remove` button on the popup page. The saved login and repository are removed.
- GitHub cannot revoke a token without the client secret, so the [authorized apps page](https://github.com/settings/applications) opens. Revoke Source Code Uploader there if you want to remove the access on GitHub as well.

  ![Remove authorize](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/50fe3dfb-ce77-40d7-8c61-b11b1e2745b2)

## Commit

- Click on the programming language for the source code you want to upload on the submission status page.

![Move source code page](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/33146007-7eac-41d7-bfb2-97b51b60a9e4)

- Click on the platform icon button to upload the source code

![Click github icon button](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/978f6361-f351-4b15-8901-b804b449574f)

- If the commit is successful, the commit address will be displayed.

![Show successful result](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/bd2901dc-1679-4527-a515-70ff8328839c)

- If the same source code has already been uploaded, it will not be uploaded again. (The source code must match exactly.)

![Show same code result](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/ca4487a7-254a-4e4d-a6f6-b7695dee9fcb)

- If an error occurs, the cause of the error will be displayed.

![Show error](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/63ceb88e-b5cc-406c-b856-55eb196df622)

- Navigate to the upload address or go to the repository to verify the commit.

![Check github commit](https://github.com/Seojeonguk/sourceCodeUploader/assets/44386047/f4c75ebf-1a16-4889-84cd-a300d77d1afa)
