import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import {
  blindDate,
  blindDateMeta,
  Gender,
  Intent,
  PersonalityAnswer,
  PersonalityQuestion,
  SeekingGender,
} from "../blindDateApi";
import "./circles-local.css";

const INTENT_LABELS: Record<Intent, string> = {
  friendship: "Friendship",
  dating: "Dating",
  not_sure: "Not sure yet",
};
const SEEKING_LABELS: Record<SeekingGender, string> = {
  male: "Men",
  female: "Women",
  everyone: "Everyone",
};
const GENDER_LABELS: Record<Gender, string> = { male: "Male", female: "Female", other: "Other" };

type Step = 0 | 1 | 2 | 3;

export default function BlindDateOnboarding() {
  const { token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [interestOptions, setInterestOptions] = useState<string[]>([]);
  const [questions, setQuestions] = useState<PersonalityQuestion[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [seekingGender, setSeekingGender] = useState<SeekingGender | "">("");
  const [seekingMinAge, setSeekingMinAge] = useState("18");
  const [seekingMaxAge, setSeekingMaxAge] = useState("35");
  const [intent, setIntent] = useState<Intent | "">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, "a" | "b">>({});
  const [ageVerified, setAgeVerified] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      navigate("/login", { state: { from: "/blind-date/onboarding" }, replace: true });
    }
  }, [authLoading, token, navigate]);

  const loadMeta = () => {
    setLoadingMeta(true);
    setMetaError(false);
    blindDateMeta()
      .then((m) => {
        setInterestOptions(m.interests);
        setQuestions(m.personalityQuestions);
      })
      .catch(() => setMetaError(true))
      .finally(() => setLoadingMeta(false));
  };

  useEffect(() => {
    if (!authLoading && token) loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, token]);

  const toggleInterest = (tag: string) => {
    setInterests((cur) => {
      if (cur.includes(tag)) return cur.filter((t) => t !== tag);
      if (cur.length >= 5) return cur;
      return [...cur, tag];
    });
  };

  const step0Valid =
    displayName.trim() !== "" &&
    age !== "" && Number(age) >= 18 && gender !== "" && seekingGender !== "" &&
    seekingMinAge !== "" && seekingMaxAge !== "" && Number(seekingMinAge) <= Number(seekingMaxAge) &&
    intent !== "";
  const step1Valid = interests.length > 0;
  const step2Valid = questions.length > 0 && questions.every((q) => answers[q.id]);
  const step3Valid = ageVerified;

  const submit = async () => {
    if (!step0Valid || !step1Valid || !step2Valid || !step3Valid || submitting || !token) return;
    setSubmitting(true);
    setError("");
    try {
      await blindDate.saveProfile(token, {
        displayName: displayName.trim(),
        age: Number(age),
        gender: gender as Gender,
        seekingGender: seekingGender as SeekingGender,
        seekingMinAge: Number(seekingMinAge),
        seekingMaxAge: Number(seekingMaxAge),
        intent: intent as Intent,
        interests,
        ageVerified,
        personalityAnswers: questions.map((q): PersonalityAnswer => ({ id: q.id, choice: answers[q.id] })),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="cl-wrap">
        <div className="cl-card"><p className="cl-dim">Loading…</p></div>
      </div>
    );
  }

  if (metaError) {
    return (
      <div className="cl-wrap">
        <div className="cl-card">
          <p className="cl-err">Couldn't load onboarding — check your connection and try again.</p>
          <button className="cl-btn cl-mt" onClick={loadMeta}>Retry</button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="cl-wrap">
        <div className="cl-card">
          <span className="cl-badge">You're set</span>
          <h1 className="cl-h1">Profile saved</h1>
          <p className="cl-sub">
            We'll match you with someone compatible. Names stay hidden until you both choose to
            reveal them.
          </p>
          <NavLink className="cl-btn cl-mt" to="/blind-date/chat">Find a match</NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="cl-wrap">
      <Helmet>
        <title>Blind Date — Build Your Profile | Chatrio</title>
        <meta name="description" content="Build your Blind Date profile: a few basics, your interests, and a short personality questionnaire. No photos, no name — just enough to find someone compatible." />
      </Helmet>

      <div className="cl-card cl-onboard">
        <span className="cl-badge">Blind Date</span>
        <h1 className="cl-h1">Build your profile</h1>
        <p className="cl-sub">
          No photo, no name yet — just enough for us to find someone worth talking to.
        </p>

        <div className="cl-steps">
          {[0, 1, 2, 3].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}
        </div>

        {step === 0 && (
          <>
            <label className="cl-field cl-mt">
              <span className="cl-label">Name to reveal later</span>
              <input className="cl-input" type="text" maxLength={24} value={displayName}
                onChange={(e) => setDisplayName(e.target.value)} placeholder="Whatever you go by" />
            </label>

            <label className="cl-field cl-mt">
              <span className="cl-label">Your age</span>
              <input className="cl-input" type="number" min={18} max={120} value={age}
                onChange={(e) => setAge(e.target.value)} placeholder="25" />
            </label>

            <div className="cl-mt">
              <span className="cl-label">You are</span>
              <div className="cl-gender-row">
                {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                  <button key={g} type="button" className={`cl-gender-pill${gender === g ? " on" : ""}`}
                    onClick={() => setGender(g)}>{GENDER_LABELS[g]}</button>
                ))}
              </div>
            </div>

            <div className="cl-mt">
              <span className="cl-label">Interested in</span>
              <div className="cl-gender-row">
                {(Object.keys(SEEKING_LABELS) as SeekingGender[]).map((g) => (
                  <button key={g} type="button" className={`cl-gender-pill${seekingGender === g ? " on" : ""}`}
                    onClick={() => setSeekingGender(g)}>{SEEKING_LABELS[g]}</button>
                ))}
              </div>
            </div>

            <div className="cl-mt" style={{ display: "flex", gap: 10 }}>
              <label className="cl-field" style={{ flex: 1 }}>
                <span className="cl-label">Age range: min</span>
                <input className="cl-input" type="number" min={18} value={seekingMinAge}
                  onChange={(e) => setSeekingMinAge(e.target.value)} />
              </label>
              <label className="cl-field" style={{ flex: 1 }}>
                <span className="cl-label">max</span>
                <input className="cl-input" type="number" min={18} value={seekingMaxAge}
                  onChange={(e) => setSeekingMaxAge(e.target.value)} />
              </label>
            </div>

            <div className="cl-mt">
              <span className="cl-label">Looking for</span>
              <div className="cl-gender-row">
                {(Object.keys(INTENT_LABELS) as Intent[]).map((i) => (
                  <button key={i} type="button" className={`cl-gender-pill${intent === i ? " on" : ""}`}
                    onClick={() => setIntent(i)}>{INTENT_LABELS[i]}</button>
                ))}
              </div>
            </div>

            <button className="cl-btn cl-mt" disabled={!step0Valid} onClick={() => setStep(1)}>Continue</button>
          </>
        )}

        {step === 1 && (
          <>
            <p className="cl-sub">Pick up to 5 things you're into.</p>
            <div className="cl-gender-row">
              {interestOptions.map((tag) => (
                <button key={tag} type="button" className={`cl-gender-pill${interests.includes(tag) ? " on" : ""}`}
                  onClick={() => toggleInterest(tag)}>{tag}</button>
              ))}
            </div>
            <div className="cl-mt" style={{ display: "flex", gap: 10 }}>
              <button className="cl-btn cl-ghost" onClick={() => setStep(0)}>Back</button>
              <button className="cl-btn" disabled={!step1Valid} onClick={() => setStep(2)}>Continue</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="cl-sub">Six quick either/or questions — there's no wrong answer.</p>
            {questions.map((q) => (
              <div className="cl-mt" key={q.id}>
                <div className="cl-gender-row">
                  <button type="button" className={`cl-gender-pill${answers[q.id] === "a" ? " on" : ""}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: "a" }))}>{q.a}</button>
                  <button type="button" className={`cl-gender-pill${answers[q.id] === "b" ? " on" : ""}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: "b" }))}>{q.b}</button>
                </div>
              </div>
            ))}
            <div className="cl-mt" style={{ display: "flex", gap: 10 }}>
              <button className="cl-btn cl-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="cl-btn" disabled={!step2Valid} onClick={() => setStep(3)}>Continue</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="cl-sub">Last thing.</p>
            <label className="cl-check">
              <input type="checkbox" checked={ageVerified} onChange={(e) => setAgeVerified(e.target.checked)} />
              I confirm I'm 18 years or older
            </label>
            {error && <p className="cl-err">{error}</p>}
            <div className="cl-mt" style={{ display: "flex", gap: 10 }}>
              <button className="cl-btn cl-ghost" onClick={() => setStep(2)}>Back</button>
              <button className="cl-btn" disabled={!step3Valid || submitting} onClick={submit}>
                {submitting ? "Saving…" : "Save profile"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
