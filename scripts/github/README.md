# Usage

## Table of Contents

1. [Authorize](#authorize)
2. [Select Repository for Upload](#select-repository-for-upload)
3. [Remove Authorize](#remove-authorize)
4. [Commit](#commit)
5. [Auto upload](#auto-upload)

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

- Open a problem on [Programmers](https://school.programmers.co.kr/) and write your solution.
- Click the GitHub icon button at the top right of the code editor.
- The source code is committed to `Programmers/{problem title}.{extension}` in the selected repository.
- If the commit is successful, a message with an `Open` link to the uploaded file is shown at the bottom right of the page.
- If the same source code has already been uploaded, it is not committed again and a message says so. (The source code must match exactly.)
- If an error occurs, the cause of the error is shown in the message.

## Auto upload

- Turn on the auto upload switch of GitHub on the popup page.
- When the result of `제출 후 채점하기` is `정답`, the source code is committed without clicking the button.
