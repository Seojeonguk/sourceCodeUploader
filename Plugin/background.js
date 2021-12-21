chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: dataload,
    });
});

async function dataload() {
    document.querySelectorAll("tbody tr").forEach((item) => {
        if (item.childNodes[3].firstChild.innerText === "맞았습니다!!") {
            let newTd = document.createElement("td");
            let newBtn = document.createElement("button");
            newBtn.innerText = "Upload";
            newBtn.setAttribute("submissionNum", item.firstChild.innerText);
            newBtn.setAttribute("problemNum", item.childNodes[2].lastChild.innerText);
            newBtn.onclick = function () {
                var sourcecode;
                var title;
                var tags = [];

                // 소스코드 구하기
                var sourcecodeConn = new XMLHttpRequest();
                var url = `https://www.acmicpc.net/source/${this.getAttribute("submissionNum")}`;

                sourcecodeConn.open("GET", url, false);
                sourcecodeConn.onreadystatechange = function () {
                    if (sourcecodeConn.readyState == 4 && sourcecodeConn.status == 200) {
                        //let sourcecode = sourcecodeConn.responseText.split("readonly>")[1].split("</textarea>")[0];
                        sourcecode = sourcecodeConn.responseText.split("readonly>")[1].split("</textarea>")[0];
                        sourcecode = sourcecode.replace(/&lt;/gi, "<");
                        sourcecode = sourcecode.replace(/&gt;/gi, ">");
                        sourcecode = sourcecode.replace(/&quot;/gi, '"');
                        sourcecode = sourcecode.replace(/&amp;/gi, "&");
                    }
                };
                sourcecodeConn.send();

                // 문제정보 가져오기(제목, 태그)
                var problemConn = new XMLHttpRequest();
                var url = `https://www.acmicpc.net/problem/${this.getAttribute("problemNum")}`;
                problemConn.open("GET", url, false);
                problemConn.onreadystatechange = function () {
                    if (problemConn.readyState == 4 && problemConn.status == 200) {
                        title = problemConn.responseText.split(`<span id="problem_title">`)[1].split("</span>")[0];

                        const tagReg = RegExp('(class="spoiler-link">)(.*)(</a>)', "g");
                        let tagInfo;
                        while ((tagInfo = tagReg.exec(problemConn.responseText)) !== null) {
                            tags.push(tagInfo[2]);
                        }
                    }
                };
                problemConn.send();

                console.log(sourcecode);
                console.log(title);
                console.log(tags);

                var pom = document.createElement("a");
                pom.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(sourcecode));
                pom.setAttribute("download", `BOJ_${this.getAttribute("problemNum")}.txt`);

                if (document.createEvent) {
                    var event = document.createEvent("MouseEvents");
                    event.initEvent("click", true, true);
                    pom.dispatchEvent(event);
                } else {
                    pom.click();
                }
            };
            newTd.appendChild(newBtn);
            item.appendChild(newTd);
        }
    });
}
