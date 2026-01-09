import React from "react";

export default function Snowflake({ delay, duration, left }) {
  return (
    <div
      className="snowflake"
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      ❄
    </div>
  );
}
