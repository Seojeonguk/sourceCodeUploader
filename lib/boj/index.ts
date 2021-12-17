import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:"https://www.acmicpc.net/",
})

export default axios;