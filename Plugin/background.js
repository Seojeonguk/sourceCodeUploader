chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: dataload,
    });
});

async function dataload() {
    document.querySelectorAll("tbody tr").forEach((tr) => {
        if (tr.childNodes[3].firstChild.innerText === "맞았습니다!!") {
            let newTd = document.createElement("td");
            let newBtn = document.createElement("button");
            newBtn.innerText = "Upload";
            newBtn.setAttribute("submissionNum", tr.firstChild.innerText);
            newBtn.setAttribute("problemNum", tr.childNodes[2].lastChild.innerText);
            newBtn.onclick = function () {
                var sourcecode;
                var title;
                var tags = [];

                var sourcecodeConn = new XMLHttpRequest();
                var url = `https://www.acmicpc.net/source/${this.getAttribute("submissionNum")}`;

                sourcecodeConn.open("GET", url, false);
                sourcecodeConn.onreadystatechange = function () {
                    if (sourcecodeConn.readyState == 4 && sourcecodeConn.status == 200) {
                        let responseText = sourcecodeConn.responseText;

                        let openTextarea = new RegExp("(<textarea[^>]*>)", "g");
                        let closeTextarea = new RegExp("(</textarea>)", "g");

                        sourcecode = responseText.split(openTextarea)[2].split(closeTextarea)[0];
                        sourcecode = sourcecode.replace(/&lt;/gi, "<");
                        sourcecode = sourcecode.replace(/&gt;/gi, ">");
                        sourcecode = sourcecode.replace(/&quot;/gi, '"');
                        sourcecode = sourcecode.replace(/&amp;/gi, "&");
                    }
                };
                sourcecodeConn.send();

                const problemConn = new XMLHttpRequest();
                problemConn.withCredentials = true;

                problemConn.addEventListener("readystatechange", function () {
                    if (this.readyState === this.DONE) {
                        let problemInfo = JSON.parse(this.response);

                        title = problemInfo.titleKo;

                        problemInfo.tags.forEach((tag) => {
                            tags.push(tag.displayNames[1].name);
                        });
                    }
                });

                problemConn.open(
                    "GET",
                    `https://solved.ac/api/v3/problem/show?problemId=${this.getAttribute("problemNum")}`
                );
                problemConn.setRequestHeader("Content-Type", "application/json");

                problemConn.send();

                // TODO Add more
            };
            newTd.appendChild(newBtn);
            tr.appendChild(newTd);
        }
    });
}
