# AutoUpload

Unofficial automatic upload.

- Plugin to BOJ scoring status
- Automatically upload the source code to notion.

# Prerequisites

## Settings for Plugin

### Activate the chrome extension

Enter `chrome://extensions` to access. Then, activate the developer mode in the upper right corner.
![image](https://user-images.githubusercontent.com/44386047/210470325-8fd32660-b398-42be-aacd-5685b3b8cf20.png)

Load a plugin folder with `manifest.json` as root through the `Load uncompressed extension` button. (`AutoUpload\Plugin`)

### Get access token

Get access token for github upload.

[Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

### Enter information required for upload

Click autoupload through the extension button in the upper right corner of the chrome.
(Press the pin button to secure it to the upper right without pressing the extension button.)

![image](https://user-images.githubusercontent.com/44386047/210471018-047984f9-3d06-4e90-ad33-5613c236998b.png)

Then, when the following pop-up window appears, enter the information you need to upload.

![image](https://user-images.githubusercontent.com/44386047/210470972-15b4ee9c-31ae-4a2a-90a7-fe9b8fa4fbe3.png)

- `notion token` : token required to upload notion
- `notion url` : path to upload to notion
- `github token` : token required for github upload
- `github username` : username to commit github
- `github repository` : repository to commit to github
- `github folder` : path in repository
- `request url` : server address to request upload (the request must be applied with `https`)

## Settings for django

First, install the docker by referring to the following site.

[Install Docker](https://docs.docker.com/engine/install/ubuntu/)

Then, The certificate is issued through the following command:

`sudo certbot --standalone -d [domain name] certonly`

(If you use the following `--dry-run` option, you can proceed with the certificate issuance test.

There are restrictions on issuing certificates, so it is recommended to proceed before issuing certificates.)

Finally, set up nginx so that requests to the domain can be directed to the server as follows:

```
server {
        listen 80;
        listen [::]:80;

        server_name [domain name];

        return 301 https://$host$request_uri;
}

server {
        listen 443 ssl;
        listen [::]:443;

        server_name [domain name];

        location /bojupload {
                proxy_pass [server url];
        }

        ssl_certificate /etc/letsencrypt/live/[domain name]/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/[domain name]/privkey.pem;
}
```

# Run

Go to the grading status and click the language, not the Modify button.

![image](https://user-images.githubusercontent.com/44386047/210473776-d95184f2-5bff-4e47-a3fb-96b7006e63cb.png)

You will see an upload icon in the upper right corner of the source code, and if you press that button, it will be uploaded based on the information.

![image](https://user-images.githubusercontent.com/44386047/210473785-d8385976-2d48-4fb2-b317-467c04c7d1fd.png)
