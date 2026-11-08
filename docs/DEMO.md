# SkillRelay demo walkthrough

## Before the demo

Follow the root README to start the backend and frontend. Set your own API key
in `backend/.env` for live feedback. The development server proxies `/api` to
the backend at `127.0.0.1:5001`. Do not put the API key in the frontend.

The demo runs locally because the inherited runner executes Python directly
on the host. Use trusted practice code. Check browser microphone permissions
if demonstrating speech; typed explanations are a complete alternative.

## Three-minute story

### 0:00-0:25: introduce the learner

"A developer can know how to solve a problem and still struggle to explain the
reasoning in an interview. SkillRelay turns one practice explanation into a
specific next lesson and a record of practice."

Select **Explain clearly**. Point out that goals prioritize tied learning gaps,
while feedback still uses the same six rubric dimensions.

### 0:25-1:00: solve and explain

Choose Two Sum. Start the microphone in the Code & explain workspace and talk
through the approach while entering a solution. Typed explanations are also
available in the same workspace. Run code without leaving the session:

```python
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for index, value in enumerate(nums):
            if target - value in seen:
                return [seen[target - value], index]
            seen[value] = index
```

The editor, tests, and explanation remain available together. Stop the
microphone, review the transcript, then choose Get session feedback.
For example, explain the input/output, a baseline, and why a map helps. Do not
pretend that a scripted explanation guarantees a particular model score.

### 1:00-1:45: make feedback actionable

Show the recommended lesson, its reason, the three learning steps, the practice
prompt, and the self-check. The recommendation uses the lowest `score / max`
ratio; tied dimensions are prioritized by the goal. Fully covered rubrics
receive transfer practice rather than a fabricated weakness.

Choose Save practice for the first summary, then click Practice this lesson. The code and
explanation stay in place, and the problem panel shows the current learning
focus. Continue coding and explaining in the shared workspace, then request
feedback again.

### 1:45-2:30: show continuity

Save the second practice result, open Progress, and reload the page. Saved
summaries remain available. Expand a rubric breakdown and explain any score
comparison: only the same problem and goal are compared. The second score
may go up, down, or stay the same because AI practice feedback can vary.

### 2:30-3:00: connect to the prompt

"This supports Prompt 2 through technical communication practice and short,
targeted learning activities. A learner leaves with a concrete next step,
rather than only a score."

Mention that summaries stay in this browser, and code and transcripts are not
stored in history. Peer matching and cloud accounts are future milestones.

## Demo honesty and submission context

- If demonstrating a fixture or recording, label it as such. Browser verification
  during development used a temporary labeled fixture because no API key was
  configured. That fixture is not shipped as an application mode.
- Attribute the inherited SpeakCode editor, challenges, scoring, and follow-ups.
  Identify goals, curated lessons, recommendation logic, retries, and saved
  progress as the learning-loop additions.
- The supplied event rules still need organizer clarification about inherited
  application reuse. A new name and branch alone do not establish eligibility.
- A private repository needs appropriate judge access. Demo recording, AI-use
  disclosure, and submission are separate work from implementing this branch.
