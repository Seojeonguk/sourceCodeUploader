const fetchSourceCodeBySubmitNum = async (submitNum) => {
  const response = await fetch(
    `https://www.acmicpc.net/source/download/${submitNum}`,
  );

  const text = await response.text();

  return text;
};
