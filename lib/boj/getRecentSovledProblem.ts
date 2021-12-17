import { axiosInstance } from ".";

interface submitData {
  submitNum?:string,
  problemNum?:string
};

const getRecentCorrectProblem = async(Id:string) => {
  const userInfo = await axiosInstance.get(`status?user_id=${Id}&result_id=4`);
  const trrgx = new RegExp("<\s*tr[^>]*><td>(.*?)</td><\s*/\s*tr>","g");
  
  const solution = "solution-";
  const problem = "/problem/";
  
  let submitDatas:Array<submitData>=[];
  
  let tr;
  while((tr = trrgx.exec(userInfo.data))!==null) {
    const solutionTr = tr[0].match(`${solution}[0-9]*`) as RegExpMatchArray;
    const submitNumber = solutionTr[0].replace(solution,"");
    
    const problemTr = tr[0].match(`${problem}[0-9]*`) as RegExpExecArray;
    const problemNumber = problemTr[0].replace(problem,"");
    
    const submitdata:submitData = {
      submitNum : submitNumber,
      problemNum : problemNumber
    };
    
    submitDatas.push(submitdata);
  }
  
  return submitDatas;
}

export default getRecentCorrectProblem;