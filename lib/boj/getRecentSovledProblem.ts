import { axiosInstance } from ".";

interface submitData {
  submitNum?:string,
  problemNum?:string
};

const getRecentSovledProblem = async(Id:string) => {
  const solvedProblemPage = await axiosInstance.get(`status?user_id=${Id}&result_id=4`);
  const trRgx = new RegExp("<\s*tr[^>]*><td>(.*?)</td><\s*/\s*tr>","g");
  
  const solution = "solution-";
  const problem = "/problem/";
  
  let submitInfo:Array<submitData>=[];
  
  let tr;
  while((tr = trRgx.exec(solvedProblemPage.data))!==null) {
    const solutionTr = tr[0].match(`${solution}[0-9]*`) as RegExpMatchArray;
    const submitNumber = solutionTr[0].replace(solution,"");
    
    const problemTr = tr[0].match(`${problem}[0-9]*`) as RegExpExecArray;
    const problemNumber = problemTr[0].replace(problem,"");
    
    const submitdata:submitData = {
      submitNum : submitNumber,
      problemNum : problemNumber
    };
    
    submitInfo.push(submitdata);
  }
  
  return submitInfo;
}

export default getRecentSovledProblem;