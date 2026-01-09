interface Props {
  title: string;
  description: string;
}

export const Title = ({ title, description }: Props) => {
  return (
    <div className="flex items-center justify-between mb-3 sm:mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-light-text dark:text-dark-text">
          {title}
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
  return <div className="w-full max-w-4xl mx-auto sm:pt-2">{children}</div>;
};
