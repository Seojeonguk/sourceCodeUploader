import { readFileSync } from "fs";
import path from "path";

const getContent = async () => {
  const textFile = readFileSync(path.join(__dirname,"../../../public/solvedProblem.txt"),"utf-8");
  const solvedProblems = textFile.split(' ');
  return solvedProblems;
}

export default getContent