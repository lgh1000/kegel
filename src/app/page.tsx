'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const ExerciseMode = {
  BOTH: 'both',
  STRENGTHEN: 'strengthen',
  RELAX: 'relax'
};

// animation function
const easeInOutCubic = (x: number) => {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const MIN_SCALE = 0.26;  // Smallest circle size (26% of original)
const DEFAULT_SCALE = 1; // Default circle size (100% of original)



// Generate exercise patterns for all levels
const generateExerciseLevels = () => {
  const levels = {};
  const knownLevels = [1, 10, 23, 25];
  const knownPatterns = {
    1: {
      strength_pull: { pullTime: 4, relaxTime: 4, reps: 4 },
      strength_push: { pullTime: 4, relaxTime: 4, reps: 4 },
      aerobic_pull: { pullTime: 1, relaxTime: 1, reps: 6 },
      aerobic_push: { pullTime: 1, relaxTime: 1, reps: 6 },
      endurance_pull: { pullTime: 6, relaxTime: 4, reps: 3 },
      endurance_push: { pullTime: 6, relaxTime: 4, reps: 3 }
    },
    10: {
      strength_pull: { pullTime: 6, relaxTime: 4, reps: 5 },
      strength_push: { pullTime: 6, relaxTime: 4, reps: 5 },
      aerobic_pull: { pullTime: 0.6, relaxTime: 0.6, reps: 12 },
      aerobic_push: { pullTime: 0.6, relaxTime: 0.6, reps: 12 },
      endurance_pull: { pullTime: 15, relaxTime: 4, reps: 4 },
      endurance_push: { pullTime: 15, relaxTime: 4, reps: 4 }
    },
    23: {
      strength_pull: { pullTime: 9, relaxTime: 3, reps: 5 },
      strength_push: { pullTime: 9, relaxTime: 3, reps: 5 },
      aerobic_pull: { pullTime: 0.5, relaxTime: 0.5, reps: 18 },
      aerobic_push: { pullTime: 0.5, relaxTime: 0.5, reps: 18 },
      endurance_pull: { pullTime: 28, relaxTime: 4, reps: 6 },
      endurance_push: { pullTime: 28, relaxTime: 4, reps: 6 }
    },
    25: {
      strength_pull: { pullTime: 10, relaxTime: 2, reps: 6 },
      strength_push: { pullTime: 10, relaxTime: 2, reps: 6 },
      aerobic_pull: { pullTime: 0.5, relaxTime: 0.5, reps: 20 },
      aerobic_push: { pullTime: 0.5, relaxTime: 0.5, reps: 20 },
      endurance_pull: { pullTime: 30, relaxTime: 4, reps: 6 },
      endurance_push: { pullTime: 30, relaxTime: 4, reps: 6 }
    }
  };

  // Interpolate for all levels between known points
  for (let level = 1; level <= 25; level++) {
    if (knownPatterns[level]) {
      levels[level] = {
        sets: [
          { type: 'strength', action: 'pull', ...knownPatterns[level].strength_pull },
          { type: 'strength', action: 'push', ...knownPatterns[level].strength_push },
          { type: 'aerobic', action: 'pull', ...knownPatterns[level].aerobic_pull },
          { type: 'aerobic', action: 'push', ...knownPatterns[level].aerobic_push },
          { type: 'endurance', action: 'pull', ...knownPatterns[level].endurance_pull },
          { type: 'endurance', action: 'push', ...knownPatterns[level].endurance_push }
        ]
      };
      continue;
    }

    // Find surrounding known levels for interpolation
    const lowerLevel = Math.max(...knownLevels.filter(l => l <= level));
    const upperLevel = Math.min(...knownLevels.filter(l => l >= level));
    const ratio = (level - lowerLevel) / (upperLevel - lowerLevel);

    const interpolate = (lower, upper) => ({
      pullTime: Number((lower.pullTime + (upper.pullTime - lower.pullTime) * ratio).toFixed(1)),
      relaxTime: Number((lower.relaxTime + (upper.relaxTime - lower.relaxTime) * ratio).toFixed(1)),
      reps: Math.round(lower.reps + (upper.reps - lower.reps) * ratio)
    });

    const pattern = {
      strength_pull: interpolate(knownPatterns[lowerLevel].strength_pull, knownPatterns[upperLevel].strength_pull),
      strength_push: interpolate(knownPatterns[lowerLevel].strength_push, knownPatterns[upperLevel].strength_push),
      aerobic_pull: interpolate(knownPatterns[lowerLevel].aerobic_pull, knownPatterns[upperLevel].aerobic_pull),
      aerobic_push: interpolate(knownPatterns[lowerLevel].aerobic_push, knownPatterns[upperLevel].aerobic_push),
      endurance_pull: interpolate(knownPatterns[lowerLevel].endurance_pull, knownPatterns[upperLevel].endurance_pull),
      endurance_push: interpolate(knownPatterns[lowerLevel].endurance_push, knownPatterns[upperLevel].endurance_push)
    };  

    levels[level] = {
      sets: [
        { type: 'strength', action: 'pull', ...pattern.strength_pull },
        { type: 'strength', action: 'push', ...pattern.strength_push },
        { type: 'aerobic', action: 'pull', ...pattern.aerobic_pull },
        { type: 'aerobic', action: 'push', ...pattern.aerobic_push },
        { type: 'endurance', action: 'pull', ...pattern.endurance_pull },
        { type: 'endurance', action: 'push', ...pattern.endurance_push }
      ]
    };
  }

  return levels;
};

const exerciseLevels = generateExerciseLevels();

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  //return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
};

export default function KegelTimer() {
  const [mode, setMode] = useState(ExerciseMode.BOTH);
  const [level, setLevel] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [currentSet, setCurrentSet] = useState(0);
  const [currentRep, setCurrentRep] = useState(0);
  const [isRest, setIsRest] = useState(false);
  const [timeLeft, setTimeLeft] = useState(4);
  const [scale, setScale] = useState(1);
  const [totalTime, setTotalTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [phase, setPhase] = useState('pull');

  // Get current exercise based on mode and level
  const getCurrentExercise = useCallback(() => {
    const levelData = exerciseLevels[level];
    let filteredSets;
  
    if (mode === ExerciseMode.BOTH) {
      filteredSets = levelData.sets;
    } else if (mode === ExerciseMode.STRENGTHEN) {
      filteredSets = levelData.sets.filter(set => set.action === 'pull');
    } else {
      filteredSets = levelData.sets.filter(set => set.action === 'push');
    }
    
    return currentSet < filteredSets.length ? filteredSets[currentSet] : null;
  }, [currentSet, mode, level]);
  //   const filteredSets = mode === ExerciseMode.STRENGTHEN 
  //     ? levelData.sets.filter(set => set.action === 'pull')
  //     : mode === ExerciseMode.RELAX 
  //       ? levelData.sets.filter(set => set.action === 'push')
  //       : levelData.sets;
  //   return filteredSets[currentSet];
  // }, [currentSet, mode, level]);

  // Calculate total workout time
  useEffect(() => {
    const levelData = exerciseLevels[level];
    const filteredSets = mode === ExerciseMode.STRENGTHEN 
      ? levelData.sets.filter(set => set.action === 'pull')
      : mode === ExerciseMode.RELAX 
        ? levelData.sets.filter(set => set.action === 'push')
        : levelData.sets;
    
    let total = 0;
    filteredSets.forEach(set => {
      total += (set.pullTime + set.relaxTime) * set.reps;
    });
    
    if (filteredSets.length > 1) {
      total += 7 * (filteredSets.length - 1); // Add rest periods between sets
    }
    
    setTotalTime(total);
  }, [mode, level]);

  // Add a new state to track if we're just coming from rest
  const [isPostRest, setIsPostRest] = useState(false);
  // const [animationStartScale, setAnimationStartScale] = useState(DEFAULT_SCALE);

  // // Track previous scale to handle transitions
  // const [previousScale, setPreviousScale] = useState(DEFAULT_SCALE);

// MAIN CIRCLE ANIMATION LOGIC
useEffect(() => {
  if (!isActive || !getCurrentExercise()) return;
  
  const exercise = getCurrentExercise();
  
  if (isRest) {
    setScale(DEFAULT_SCALE);
    return;
  }

  if (isPostRest) {
    const initialScale = exercise.action === 'pull' ? DEFAULT_SCALE : MIN_SCALE;
    setScale(initialScale);
    setIsPostRest(false);
    return;
  }

  // Handle regular exercise phases
  let startScale, endScale;
  
  if (exercise.action === 'pull') {
    if (phase === 'pull') {
      startScale = DEFAULT_SCALE;
      endScale = MIN_SCALE;
    } else { // relax
      startScale = MIN_SCALE;
      endScale = DEFAULT_SCALE;
    }
  } else { // push exercise
    if (phase === 'push') {
      startScale = MIN_SCALE;
      endScale = DEFAULT_SCALE;
    } else { // relax
      startScale = DEFAULT_SCALE;
      endScale = MIN_SCALE;
    }
  }

  // Animate between scales
  const startTime = performance.now();
  const duration = (phase === 'relax' ? exercise.relaxTime : exercise.pullTime) * 1000;

  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);
    const newScale = startScale + (endScale - startScale) * easedProgress;
    
    setScale(newScale);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  const animationFrame = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationFrame);
}, [isActive, phase, getCurrentExercise, isRest, isPostRest]);
// // MAIN CIRCLE ANIMATION LOGIC
// useEffect(() => {
//   if (!isActive || !getCurrentExercise()) return;
  
//   const exercise = getCurrentExercise();
  
//   // During rest, just maintain default scale without animation
//   if (isRest) {
//     setScale(DEFAULT_SCALE);
//     return;
//   }

  

//   // // Special handling for post-rest state
//   // if (isPostRest) {
//   //   const initialScale = exercise.action === 'pull' ? DEFAULT_SCALE : MIN_SCALE;
//   //   setScale(initialScale);
//   //   setIsPostRest(false);
//   //   return;
//   // }

//   // Handle regular exercise phases
//   let startScale; 
//   let endScale;
  
//   if (exercise.action === 'pull') {
//     if (phase === 'pull') {
//       // Force correct starting scale for pull phase after rest
//       // startScale = isPostRest ? DEFAULT_SCALE : scale;
//       endScale = MIN_SCALE;
//     } else { // relax
//       // startScale = MIN_SCALE;
//       endScale = DEFAULT_SCALE;
//     }
//   } else { // push exercise
//     if (phase === 'push') {
//       // Force correct starting scale for pull phase after rest
//       // startScale = isPostRest ? MIN_SCALE : scale;
//       endScale = DEFAULT_SCALE;
//     } else { // relax
//       // startScale = DEFAULT_SCALE;
//       endScale = MIN_SCALE;
//     }
//   }

//   // If coming from rest, force the initial scale before animation starts
//   if (isPostRest) {
//     setScale(startScale);
//     setIsPostRest(false);
//     // Wait one frame to start animation to ensure scale is set
//     requestAnimationFrame(() => {
//       const startTime = performance.now();
//       const duration = (phase === 'relax' ? exercise.relaxTime : exercise.pullTime) * 1000;
      
//       const animate = (currentTime) => {
//         const elapsed = currentTime - startTime;
//         const progress = Math.min(elapsed / duration, 1);
//         const easedProgress = easeInOutCubic(progress);
//         const newScale = startScale + (endScale - startScale) * easedProgress;
//         setScale(newScale);
        
//         if (progress < 1) {
//           requestAnimationFrame(animate);
//         }
//       };
      
//       requestAnimationFrame(animate);
//     });
//     return;
//   }

//   // Normal animation flow
//   const startTime = performance.now();
//   const duration = (phase === 'relax' ? exercise.relaxTime : exercise.pullTime) * 1000;
  
//   const animate = (currentTime) => {
//     const elapsed = currentTime - startTime;
//     const progress = Math.min(elapsed / duration, 1);
//     const easedProgress = easeInOutCubic(progress);
//     const newScale = startScale + (endScale - startScale) * easedProgress;
//     setScale(newScale);
    
//     if (progress < 1) {
//       requestAnimationFrame(animate);
//     }
//   };

//   const animationFrame = requestAnimationFrame(animate);
//   return () => cancelAnimationFrame(animationFrame);
// }, [isActive, phase, getCurrentExercise, isRest, isPostRest, scale]);
//   // MAIN CIRCLE ANIMATION LOGIC
// useEffect(() => {
//   if (!isActive || !getCurrentExercise()) return;
  
//   // Don't animate during rest periods
//   if (isRest) {
//     setScale(DEFAULT_SCALE);
//     return;
//   }

//   const exercise = getCurrentExercise();
  
//   // Set immediate starting position when coming from rest
//   if (isPostRest) {
//     // Instantly set the correct starting size without animation
//     setScale(exercise.action === 'pull' ? DEFAULT_SCALE : MIN_SCALE);
//     setIsPostRest(false);
//     return;
//   }
//   // // Special handling for first frame after rest
//   // // Set the scale but don't return - let animation start immediately
//   // if (isPostRest) {
//   //   setIsPostRest(false);  // Clear flag immediately
//   // }
//   // // / Special handling for first frame after rest
//   // if (isPostRest) {
//   //   const exercise = getCurrentExercise();
//   //   // Just set the scale and exit - no animation this frame
//   //   setScale(exercise.action === 'pull' ? DEFAULT_SCALE : MIN_SCALE);
//   //   setIsPostRest(false);
//   //   return;
//   // }
//   // // Handle post-rest initialization
//   // if (isPostRest) {
//   //   // Set initial scale and clear post-rest flag
//   //   const initialScale = exercise.action === 'pull' ? DEFAULT_SCALE : MIN_SCALE;
//   //   setScale(initialScale);
//   //   setIsPostRest(false);
    
//   //   // Start animation in the next frame after setting initial scale
//   //   const startTime = performance.now();
//   //   const duration = exercise.pullTime * 1000;
    
//   //   // Define animation based on exercise type
//   //   const endScale = exercise.action === 'pull' ? MIN_SCALE : DEFAULT_SCALE;
    
//   //   const animate = (currentTime) => {
//   //     const elapsed = currentTime - startTime;
//   //     const progress = Math.min(elapsed / duration, 1);
//   //     const easedProgress = easeInOutCubic(progress);
//   //     const newScale = initialScale + (endScale - initialScale) * easedProgress;
//   //     setScale(newScale);
      
//   //     if (progress < 1) {
//   //       requestAnimationFrame(animate);
//   //     }
//   //   };
//   //   // Start animation in next frame after initial scale is set
//   //   requestAnimationFrame(() => requestAnimationFrame(animate));
//   //   return;
//   // }

//   // Determine start and end scales based on exercise type and phase
//   let startScale, endScale;
  
//   if (exercise.action === 'pull') {
//     if (phase === 'pull') {
//       // Pull exercise, pull phase: Start big, end small
//       startScale = DEFAULT_SCALE;
//       endScale = MIN_SCALE;
//     } else {
//       // Pull exercise, relax phase: Start small, end big
//       startScale = MIN_SCALE;
//       endScale = DEFAULT_SCALE;
//     }
//   } else {
//     if (phase === 'push') {
//       // Push exercise, push phase: Start small, end big
//       startScale = MIN_SCALE;
//       endScale = DEFAULT_SCALE;
//     } else {
//       // Push exercise, relax phase: Start big, end small
//       startScale = DEFAULT_SCALE;
//       endScale = MIN_SCALE;
//     }
//   }
//   // // Only start animation if we're not in post-rest state
//   // if (!isPostRest) {
//   //   if (exercise.action === 'pull') {
//   //     if (phase === exercise.action) { // pull phase
//   //       startScale = DEFAULT_SCALE;
//   //       endScale = MIN_SCALE;
//   //     } else { // relax phase
//   //       startScale = MIN_SCALE;
//   //       endScale = DEFAULT_SCALE;
//   //     }
//   //   } else { // push exercise
//   //     if (phase === exercise.action) { // push phase
//   //       startScale = MIN_SCALE;
//   //       endScale = DEFAULT_SCALE;
//   //     } else { // relax phase
//   //       startScale = DEFAULT_SCALE;
//   //       endScale = MIN_SCALE;
//   //     }
//   //   }
//   // }
//   const startTime = performance.now();
//   const duration = (phase === 'relax' ? exercise.relaxTime : exercise.pullTime) * 1000;
  
//   // Animation frame function
//   const animate = (currentTime) => {
//     const elapsed = currentTime - startTime;
//     const progress = Math.min(elapsed / duration, 1);
    
//     // Use easing function for smooth animation
//     const easedProgress = easeInOutCubic(progress);
//     const newScale = startScale + (endScale - startScale) * easedProgress;
    
//     setScale(newScale);
    
//     if (progress < 1) {
//       requestAnimationFrame(animate);
//     }
//   };

//   const animationFrame = requestAnimationFrame(animate);
//   return () => cancelAnimationFrame(animationFrame);
// }, [isActive, phase, getCurrentExercise, isRest, isPostRest]);

//   // If coming from rest, set initial scale immediately then start animation
//   if (isPostRest) {
//     const initialScale = exercise.action === 'pull' ? DEFAULT_SCALE : MIN_SCALE;
//     setScale(initialScale);
//     // Clear post-rest flag immediately to allow animation to proceed
//     setIsPostRest(false);
//     // Start animation in the next frame to ensure initial scale is set
//     requestAnimationFrame(() => requestAnimationFrame(animate));
//   } else {
//     // Normal animation flow
//     const animationFrame = requestAnimationFrame(animate);
//     return () => cancelAnimationFrame(animationFrame);
//   }
// }, [isActive, phase, getCurrentExercise, isRest, isPostRest]);


    // // Always start the animation, but from the correct starting point
    // if (isPostRest) {
    //   // Set correct starting position before animation begins
    //   setScale(exercise.action === 'pull' ? DEFAULT_SCALE : MIN_SCALE);
    // }
    
  //   requestAnimationFrame(animate);
  
  // }, [isActive, phase, getCurrentExercise, isRest, isPostRest]);
  
  //           // From DEFAULT to MIN during pull
  //           currentScale = DEFAULT_SCALE - (DEFAULT_SCALE - MIN_SCALE) * progress;
  //         } else {
  //           // From MIN to DEFAULT during relax
  //           currentScale = MIN_SCALE + (DEFAULT_SCALE - MIN_SCALE) * progress;
  //         }
  //       } else { // push exercise
  //         if (phase === 'push') {
  //           // From MIN to DEFAULT during push
  //           currentScale = MIN_SCALE + (DEFAULT_SCALE - MIN_SCALE) * progress;
  //         } else {
  //           // From DEFAULT to MIN during relax
  //           currentScale = DEFAULT_SCALE - (DEFAULT_SCALE - MIN_SCALE) * progress;
  //         }
  //       }
        
  //       setScale(currentScale);
  //       requestAnimationFrame(animate);
  //     } else {
  //       // Clear post-rest flag after first animation completes
  //       setIsPostRest(false);
  //     }
  //   }
  //   // Only start animation if not in post-rest state or if in relax phase
  //   if (!isPostRest || phase === 'relax') {
  //     requestAnimationFrame(animate);
  //   }
  // }, [isActive, phase, getCurrentExercise, isRest]);

    
    // // Main exercise animation (not in rest period)
    // if (isActive && !isRest) {
    //   const exercise = getCurrentExercise();
    //   if (!exercise) return;

    //   const startTime = performance.now();// Get precise current time
    //   const duration = (phase === 'relax' ? exercise.relaxTime : exercise.pullTime) * 1000; // Convert seconds to milliseconds
    //   let startScale = scale; //
    //   let targetScale;// The size we want to animate to
    //   // let startScale, endScale;
    //   // const duration = (phase === exercise.action ? exercise.pullTime : exercise.relaxTime) * 1000;
    //   // // const startScale = phase === 'pull' ? 1 : 0.5;
    //   // // const endScale = phase === 'pull' ? 0.5 : 1;
    //   // const startScale = 1;
    //   // let endScale;

    //   // 
    //   // Determine target scale based on phase and action
    //   // if (phase === 'relax') {
    //   //   if (exercise.action === 'pull') {
    //   //     // startScale = MIN_SCALE;
    //   //     targetScale = DEFAULT_SCALE; // End of pull-relax goes to default
    //   //   } else {
    //   //     // startScale = MAX_SCALE;
    //   //     targetScale = MIN_SCALE; // End of push-relax goes to small
    //   //   }
    //   // } else if (exercise.action === 'pull') {
    //   //   // startScale = DEFAULT_SCALE;
    //   //   targetScale = MIN_SCALE; // Pull gets smaller
    //   // } else { // push
    //   //   // startScale = DEFAULT_SCALE;
    //   //   targetScale = DEFAULT_SCALE; // Push gets bigger
    //   // }
    //   // For pull exercises
    //   if (exercise.action === 'pull') {
    //     if (phase === 'pull') {
    //       // startScale = DEFAULT_SCALE;
    //       targetScale = (phase === 'pull') ? MIN_SCALE : DEFAULT_SCALE;
    //     } else {  // push
    //       // startScale = MIN_SCALE;
    //       targetScale = (phase === 'push') ? DEFAULT_SCALE : MIN_SCALE;
    //     }
    //   }
    //   // // For push exercises
    //   // else {
    //   //   if (phase === 'push') {
    //   //     // startScale = MIN_SCALE;
    //   //     targetScale = DEFAULT_SCALE;  // Expand to default during push
    //   //   } else {  // relax phase
    //   //     // startScale = DEFAULT_SCALE;
    //   //     targetScale = MIN_SCALE;  // Return to contracted during relax
    //   //   }
    //   // }

  //     // Animation function that runs every frame
  //     const animate = (currentTime) => {
  //       const elapsed = currentTime - startTime;// How much time has passed
  //       const rawProgress = Math.min(elapsed / duration, 1);
  //       const easedProgress = easeInOutCubic(rawProgress);
        
  //       // Calculate new scale using the eased progress
  //       const newScale = startScale + (targetScale - startScale) * easedProgress;
  //       setScale(newScale);

  //       if (rawProgress < 1) {
  //         // Calculate intermediate scale using current progress
  //         const newScale = startScale + (targetScale - startScale) * easedProgress;
  //         setScale(newScale);
  //         // Request next animation frame
  //         animationFrame = requestAnimationFrame(animate);
  //       } else {
  //         // Ensure we reach exactly the target scale at the end
  //         setScale(targetScale);
  //       }
  //     };

    
  //         // Start the animation

  //     animationFrame = requestAnimationFrame(animate);
  //   }

  //   //   // if in rest
  //   // } else if (isRest) {
  //   //   // Smooth transition to rest state
  //   //   const startTime = performance.now();
  //   //   const duration = 1000; // 1 second transition to rest state
  //   //   const startScale = scale;
  //   //   // const targetScale = DEFAULT_SCALE;
      
  //   //   const animate = (currentTime) => {
  //   //     const elapsed = currentTime - startTime;
  //   //     const progress = elapsed / duration;
  //   //   // Always animate to DEFAULT_SCALE during rest
  //   //     if (progress < 1) {
  //   //       const newScale = startScale + (DEFAULT_SCALE - startScale) * progress;
  //   //       setScale(newScale);
  //   //       animationFrame = requestAnimationFrame(animate);
  //   //     } else {
  //   //       setScale(DEFAULT_SCALE);
  //   //     }
  //   //   };
      
  //   //   animationFrame = requestAnimationFrame(animate);
  //   // }

  // // Cleanup function - cancels animation if effect re-runs or component unmounts
  //   return () => {
  //     if (animationFrame) {
  //       cancelAnimationFrame(animationFrame);
  //     }
  //   };
  // }, [isActive, phase, isRest, getCurrentExercise, scale]);

  // Timer effect
  useEffect(() => {
    let interval;
    
    if (isActive) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 0) {
            const exercise = getCurrentExercise();
            if (!exercise) {
              setIsActive(false);
              return 0;
            }
  
            // Handle rest period end
            if (isRest) {
              const filteredSets = mode === ExerciseMode.STRENGTHEN 
                ? exerciseLevels[level].sets.filter(set => set.action === 'pull')
                : mode === ExerciseMode.RELAX 
                  ? exerciseLevels[level].sets.filter(set => set.action === 'push')
                  : exerciseLevels[level].sets;
              
              const nextSet = currentSet + 1;
              if (nextSet >= filteredSets.length) {
                setIsActive(false);
                return 0;
              }
  
              const nextExercise = filteredSets[nextSet];
              
              // Set states in specific order
              setIsPostRest(true);  // Set before phase change CRUCIAL!!!!!
              setIsRest(false);
              setCurrentSet(nextSet);
              setCurrentRep(0);
              setPhase(nextExercise.action);
              
              return nextExercise.pullTime;
            }
  
            // Handle phase changes
            if (phase === exercise.action) {
              setPhase('relax');
              return exercise.relaxTime;
            } else {
              const nextRep = currentRep + 1;
              if (nextRep >= exercise.reps) {
                const filteredSets = mode === ExerciseMode.STRENGTHEN 
                  ? exerciseLevels[level].sets.filter(set => set.action === 'pull')
                  : mode === ExerciseMode.RELAX 
                    ? exerciseLevels[level].sets.filter(set => set.action === 'push')
                    : exerciseLevels[level].sets;
                
                if (currentSet + 1 < filteredSets.length) {
                  setIsRest(true);
                  return 5; // Rest period
                } else {
                  setIsActive(false);
                  return 0;
                }
              }
              setCurrentRep(nextRep);
              setPhase(exercise.action);
              return exercise.pullTime;
            }
          }
          return time - 0.1;
        });
        
        setElapsedTime(prev => prev + 0.1);
      }, 100);
    }
  
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, phase, currentSet, currentRep, isRest, getCurrentExercise, mode, level]);

  const startTimer = () => {
    if (!isActive) {
      const exercise = getCurrentExercise();
      if (exercise) {
        setTimeLeft(exercise.pullTime);
        setPhase(exercise.action);
        // Set initial scale based on exercise type
        setScale(exercise.action === 'push' ? MIN_SCALE : DEFAULT_SCALE);
      }
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setCurrentSet(0);
    setCurrentRep(0);
    const exercise = getCurrentExercise();
    setTimeLeft(exercise ? exercise.pullTime : 4);
    setPhase(exercise?.action || 'pull');
    setScale(1);
    setElapsedTime(0);
    setIsRest(false);
  };

  


  return (
    <div className="flex flex-col items-center p-2 md:p-4 max-w-6xl mx-auto min-h-screen">
      {/* Reduced top margin and font size */}
      <h1 className="text-xl md:text-3xl font-bold mb-4">PELVIC STRENGTHENING & REHAB PROGRAM</h1>
      
      {/* Progress Bar - reduced margins */}
      <div className="w-full mb-1">
        <div className="flex justify-between mb-1">
          <span>Progress</span>
          <span>{formatTime(elapsedTime)} / {formatTime(totalTime)}</span>
        </div>
        <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-blue-300 h-full transition-all duration-100"
            style={{ width: `${(elapsedTime / totalTime) * 100}%` }}
          />
        </div>
      </div>
  
      {/* Main Exercise Circle - slightly reduced size and margins */}
      <div className="w-full md:w-2/3 relative mb-1">
        <div className="pb-[80%] relative"> {/* This creates a more compact aspect ratio */}
          <div className="absolute inset-0">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle
                cx="50"
                cy="50"
                r={35 * scale}
                fill={isRest ? '#9A7D0A' : getCurrentExercise()?.action === 'push' ? '#D0ECE7' : '#A9DFBF'}
                style={{
                  opacity: isRest ? 0.3 : 1
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-600">
              <span className="text-2xl md:text-3xl">
                {Math.ceil(timeLeft)}s
              </span>
              {isRest ? (
                <span className="text-sm md:text-base mt-1">
                  REST
                </span>
              ) : getCurrentExercise() && (
                <>
                  <span className="text-sm md:text-base">
                    {getCurrentExercise().type.toUpperCase()} - {phase === 'relax' ? 'RELAX' : getCurrentExercise().action.toUpperCase()}
                  </span>
                  <span className="text-xs md:text-sm">
                    Rep {currentRep + 1}/{getCurrentExercise().reps}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
  
      {/* Control Buttons - reduced spacing and padding */}
      <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mt-1 mb-4">
        <button
          onClick={startTimer}
          className="px-4 py-2 rounded-lg bg-teal-400 text-white hover:bg-green-500 flex items-center justify-center space-x-2"
        >
          {isActive ? <Pause size={20} /> : <Play size={20} />}
          <span>{isActive ? 'Pause' : `Start Level ${level}`}</span>
        </button>
  
        <button
          onClick={resetTimer}
          className="px-4 py-2 rounded-lg bg-teal-300 text-white hover:bg-green-400 flex items-center justify-center space-x-2"
        >
          <RotateCcw size={20} />
          <span>Restart Level</span>
        </button>
        
        <button
          onClick={() => {
            setLevel(l => Math.min(25, l + 1));
            resetTimer();
          }}
          className="px-4 py-2 rounded-lg bg-teal-400 text-white hover:bg-green-400 text-sm text-center"
        >
          Completed level easily 2/day for a week without pain. Ready for Next level!
        </button>
      </div>
  
      {/* Bottom Section - moved closer */}
      <div className="w-full">
        {/* Instruction Boxes - reduced margins and padding */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <div className="p-2 rounded-lg bg-amber-500">
            <p className="text-sm">KEGEL / PULL: focus on your vagina/penis. Pull it in, without contracting your belly, like you are stopping yourself from peeing. For longer reps, the pulling should get stronger the more the circle closes in (pull the circle in). The pulling should lessen the more the circle expands out.</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500">
            <p className="text-sm">REVERSE KEGEL / PUSH: focus on your anus and push like you are about to fart. Except, for a reverse Kegel, move the focus forward to your vagina/penis and push, while tensing your lower belly. For longer reps, the pushing should get stronger the more the circle expands out (push the circle out). The pushing should lessen the more the circle closes in.</p>
          </div>
        </div>
  
        
  
        {/* Container for Mode Selection and References */}
        <div className="flex flex-col md:flex-row items-center justify-center relative">
          {/* Exercise Mode Selection - centered */}
          <div className="space-y-1 text-sm flex flex-col items-center">
            <label className="flex items-center space-x-2 justify-center">
              <input
                type="radio"
                checked={mode === ExerciseMode.BOTH}
                onChange={() => {
                  setMode(ExerciseMode.BOTH);
                  resetTimer();
                }}
                className="form-radio"
              />
              <span>I want to work on both strengthening my pelvic floor and address pelvic spasm</span>
            </label>
            <label className="flex items-center space-x-2 justify-center">
              <input
                type="radio"
                checked={mode === ExerciseMode.STRENGTHEN}
                onChange={() => {
                  setMode(ExerciseMode.STRENGTHEN);
                  resetTimer();
                }}
                className="form-radio"
              />
              <span>I tend to leak urine, I want to strengthen only my pelvic floor</span>
            </label>
            <label className="flex items-center space-x-2 justify-center">
              <input
                type="radio"
                checked={mode === ExerciseMode.RELAX}
                onChange={() => {
                  setMode(ExerciseMode.RELAX);
                  resetTimer();
                }}
                className="form-radio"
              />
              <span>I do not leak urine. I just have pain that may be from tight pelvic muscles</span>
            </label>
          </div>

          {/* References Link */}
          <div className="md:absolute md:right-0 md:top-0 mt-4 md:mt-0">
            <a 
              href="/references" 
              className="text-white-500 hover:text-gray-300 font-medium"
            >
              References
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
