import React from 'react';

interface SemiCircularProgressProps {
  value: number; // 0-100
  color?: string;
  size?: number;
  completedJobs: number;
  maxJobs: number;
}

const SemiCircularProgress: React.FC<SemiCircularProgressProps> = ({
  value,
  color = '#F97316',
  size = 180,
  completedJobs,
  maxJobs,
}) => {
  const strokeWidth = size * 0.08; // 8% of size
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const progress = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${centerY}`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M ${strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${centerY}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      
      {/* Centered text */}
      <div className="flex flex-col items-center -mt-8">
        <span className="text-3xl font-bold text-foreground">
          {Math.round(progress)}%
        </span>
        <span className="text-sm text-muted-foreground mt-1">
          {completedJobs}/{maxJobs === Infinity ? `${completedJobs}+` : maxJobs} Trabajos
        </span>
      </div>
    </div>
  );
};

export default SemiCircularProgress;
