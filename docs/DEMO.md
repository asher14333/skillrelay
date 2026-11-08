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

Show Replay your reasoning. Select the starting point, then a later code or
test checkpoint to show how the captured code and explanation differ. If a
verified AI observation is available, use View to inspect its source. Do not
claim an AI observation is guaranteed for every session.

Choose Save practice for the baseline, then Practice this gap. If no gap
observation was returned, use Practice this lesson in the recommended lesson
card; that action is always available for a detected rubric gap. Show its three
criteria and write a focused retry. For a memory gap, explain what the map
stores, how it grows with n, and why that means O(n) extra space. Choose Compare
explanations and show the exact quotes supporting before/after judgments.

### 1:45-2:30: show continuity

Return to feedback and choose Update saved practice. Open Progress and reload
the page to show that the retry summary remains on the same saved attempt.
Raw replay is session-only. Explain that criterion counts are AI practice
judgments, and the retry can improve, decline, or stay unchanged.

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


## Optional standout sequence: adapt to a changed requirement

1. Start Two Sum with a map solution that handles valid pairs but falls through
   without a return when there is no match. Explain the approach. Run code: 3/3.
2. Choose Reveal curveball in the problem pane. Read the no-match requirement;
   the original explanation and code are available under Before the requirement
   changed. The original cases remain and two new cases are added.
3. Run again: 3/5. Add a final `return []` and explain why it belongs after the
   loop, how the original behavior is preserved, and how the new cases verify
   the change. Run again: 5/5.
4. Choose Review my adaptation to see actual execution results alongside
   evidence-based communication checks. AI review requires the configured key;
   the test runner does not.
5. Get session feedback. If a lesson is recommended, open Watch an example,
   review the resource, and explicitly Load video (or Watch on YouTube).
   Return to Practice this lesson and apply the concept to your own code.
   Watching itself earns no credit.
6. Save practice and show the requirement-change label in Progress. Comparisons
   stay within the same variant, and raw before/after evidence is session-only.

The flow is untimed and supports typed explanations as well as the existing
microphone input. Display preferences remain available throughout.
