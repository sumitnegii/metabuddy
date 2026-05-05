import * as React from "react";

interface LoaderProps {
  size?: number;
  text?: string;
}

export const Component: React.FC<LoaderProps> = ({ size = 180, text = "Generating" }) => {
  const letters = text.split("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_50%_36%,rgba(82,82,91,0.42),transparent_30%),linear-gradient(180deg,#242424_0%,#121212_44%,#050505_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_24%,rgba(0,0,0,0.28)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" />
      <div
        className="relative flex items-center justify-center font-inter select-none"
        style={{ width: size, height: size }}
      >
        {letters.map((letter, index) => (
          <span
            key={index}
            className="inline-block text-zinc-200 opacity-45 animate-loaderLetter"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {letter}
          </span>
        ))}

        <div
          className="absolute inset-0 rounded-full animate-loaderCircle"
        ></div>
      </div>

      <style jsx>{`
        @keyframes loaderCircle {
          0% {
            transform: rotate(90deg);
            box-shadow:
              0 6px 14px 0 rgba(255, 255, 255, 0.32) inset,
              0 12px 20px 0 rgba(161, 161, 170, 0.32) inset,
              0 36px 42px 0 rgba(39, 39, 42, 0.92) inset,
              0 0 4px 1.2px rgba(255, 255, 255, 0.2),
              0 0 22px 3px rgba(249, 115, 22, 0.16);
          }
          50% {
            transform: rotate(270deg);
            box-shadow:
              0 6px 12px 0 rgba(244, 244, 245, 0.36) inset,
              0 14px 10px 0 rgba(113, 113, 122, 0.46) inset,
              0 28px 42px 0 rgba(24, 24, 27, 0.96) inset,
              0 0 4px 1.2px rgba(255, 255, 255, 0.22),
              0 0 26px 4px rgba(249, 115, 22, 0.2);
          }
          100% {
            transform: rotate(450deg);
            box-shadow:
              0 6px 14px 0 rgba(255, 255, 255, 0.32) inset,
              0 12px 20px 0 rgba(161, 161, 170, 0.32) inset,
              0 36px 42px 0 rgba(39, 39, 42, 0.92) inset,
              0 0 4px 1.2px rgba(255, 255, 255, 0.2),
              0 0 22px 3px rgba(249, 115, 22, 0.16);
          }
        }

        @keyframes loaderLetter {
          0%,
          100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          20% {
            opacity: 1;
            transform: scale(1.15);
          }
          40% {
            opacity: 0.7;
            transform: translateY(0);
          }
        }

        .animate-loaderCircle {
          animation: loaderCircle 5s linear infinite;
        }

        .animate-loaderLetter {
          animation: loaderLetter 3s infinite;
        }
      `}</style>
    </div>
  );
};
