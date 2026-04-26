import { useState, useEffect } from 'react';

const useFloatingHeader = (point: number) => {
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    const scrollYPos: any = window.addEventListener('scroll', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      window.scrollY > point ? setIsFloating(true) : setIsFloating(false);
    });

    return () => window.removeEventListener('scroll', scrollYPos);
  });

  return isFloating;
};

export default useFloatingHeader;
