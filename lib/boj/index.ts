import axios from "axios";
import getRecentSovledProblem from "./getRecentSovledProblem";

export const axiosInstance = axios.create({
  baseURL:"https://www.acmicpc.net/",
})

export default axios;

export {
  getRecentSovledProblem,
}