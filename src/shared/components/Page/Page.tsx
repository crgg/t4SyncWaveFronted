interface Props {
  title: string;
  description: string;
  count?: number;
}

export const Title = ({ title, description, count }: Props) => {
  return (
    <div className="flex items-center justify-between mb-3 sm:mb-6">
      <div>
        <h1 className="text-2xl inline-flex items-end justify-center gap-2 sm:text-3xl font-semibold text-light-text dark:text-dark-text">
          {title}{' '}
          {count ? (
            <span className="text-xs sm:text-sm bg-emerald-500 dark:bg-emerald-600 rounded-full text-white inline-flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7">
              {count}
            </span>
          ) : null}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  );
};

export const Content = ({ children }: { children: React.ReactNode }) => {
  return <div className="flex flex-col gap-1">{children}</div>;
};

export const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return <div className="w-full max-w-4xl mx-auto sm:pt-2 mb-20">{children}</div>;
};
