import React from "react";
import workMapData from "../work_map.json";
import "./Timeline.css";

interface TimelineProps {
  onSeek: (seconds: number) => void;
}

const parseTime = (timeStr: string) => {
  const [min, sec] = timeStr.split(":");
  return parseInt(min, 10) * 60 + parseInt(sec, 10);
};

export const Timeline: React.FC<TimelineProps> = ({ onSeek }) => {
  const { workflow, steps } = workMapData as any;

  return (
    <div className="timeline-container">
      <h2 className="timeline-header">Learned Work Map: {workflow}</h2>
      
      <div className="timeline-list">
        {steps.map((step: any, index: number) => (
          <div 
            key={index} 
            className="timeline-card"
            onClick={() => onSeek(parseTime(step.screen_moment))}
          >
            <div className="timeline-card-header">
              <span className="timeline-step">Step {step.step}</span>
              <button 
                className="timeline-time-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(parseTime(step.screen_moment));
                }}
                title={`Jump video to ${step.screen_moment}`}
              >
                &#9654; {step.screen_moment}
              </button>
            </div>
            
            <div className="timeline-decision">
              {step.decision}
            </div>
            
            <div className="timeline-action">
              <span>Observed: {step.observed_action}</span>
            </div>
            
            <div className="timeline-quote-box">
              <div className="timeline-quote">{step.why}</div>
            </div>
            
            <div className="timeline-tags">
              {step.guardrail && (
                <span className="timeline-tag tag-guardrail">
                  &#9888; Guardrail: {step.guardrail}
                </span>
              )}
              {step.teaching_point && (
                <span className="timeline-tag tag-teaching">
                  &#128161; Takeaway: {step.teaching_point}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
