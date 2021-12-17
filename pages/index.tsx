import Head from 'next/head'
import { GetStaticPropsContext, InferGetStaticPropsType } from "next";
import classes from "../lib/classes";

export const getStaticProps = async (_ctx: GetStaticPropsContext) => {
  return {
      props: {
        
      },
      revalidate: 10,
  };
};

const indexPage = ({  }: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
      <div className={classes(["container"])}>
          <Head>
              <title>제목</title>
          </Head>
          <article>
            <h1>This is Main Page.</h1>
          </article>
      </div>
  );
};

export default indexPage;