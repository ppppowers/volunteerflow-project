import type { NextPageContext } from 'next';
import Link from 'next/link';
import Head from 'next/head';

interface ErrorPageProps {
  statusCode?: number;
}

export default function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <>
      <Head>
        <title>Error — VolunteerFlow</title>
      </Head>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl font-bold text-danger-500 mb-4">
            {statusCode ?? '?'}
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            {statusCode === 500 ? 'Internal server error' : 'An error occurred'}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">
            {statusCode
              ? `A ${statusCode} error occurred on the server.`
              : 'An unexpected error occurred in the browser.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};
