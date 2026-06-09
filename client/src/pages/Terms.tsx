// src/pages/Terms.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <article className="max-w-[900px] mx-auto py-10 px-5 font-sans leading-loose text-slate-600 dark:text-slate-300">
      <header className="mb-12 border-b border-slate-200 dark:border-slate-700 pb-8">
        <h1 className="text-4xl md:text-5xl mb-4 font-bold text-slate-900 dark:text-slate-50">
          Terms of Service
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400">
          The legal agreement between you and Chatrio. Please read carefully.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-5 italic">
          Last Updated:{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <section className="mb-10">
        <p className="text-lg font-normal">
          Welcome to{" "}
          <strong className="text-slate-900 dark:text-slate-100">
            Chatrio
          </strong>
          . These Terms of Service ("Terms") govern your access to and use of
          the Chatrio website and services. By accessing or using the Service,
          you agree to be bound by these Terms. If you do not agree to these
          Terms, please do not use the Service.
        </p>
      </section>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        1. Age Requirement (18+)
      </h2>

      {/* Warning Box - Adapted for Light (Yellow-50) and Dark (Yellow-Transparent) */}
      <div className="bg-yellow-50 dark:bg-yellow-400/10 border-l-4 border-yellow-500 p-5 my-6 rounded-r">
        <p className="m-0 font-bold text-yellow-800 dark:text-yellow-200">
          Strictly No Minors
        </p>
        <p className="mt-2 text-yellow-700 dark:text-yellow-100/80">
          Our Service is intended solely for users who are eighteen (18) years
          of age or older. Any registration, use, or access to the Service by
          anyone under 18 is unauthorized, unlicensed, and in violation of these
          Terms.
        </p>
      </div>

      <p>
        By using the Service, you represent and warrant that you are 18 or older
        and that you agree to and to abide by all of the terms and conditions of
        this Agreement.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        2. Acceptable Use Policy
      </h2>
      <p>
        Chatrio is designed for social interaction. We prioritize the safety of
        our community. You agree that you will NOT use the Service to:
      </p>
      <ul className="list-disc pl-5 mt-4 space-y-2">
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Illegal Content:
          </strong>{" "}
          Upload, post, or transmit any content that is unlawful, harmful,
          threatening, abusive, harassing, tortious, defamatory, vulgar,
          obscene, libelous, invasive of another's privacy, hateful, or
          racially, ethnically, or otherwise objectionable.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Harm to Minors:
          </strong>{" "}
          Harm minors in any way, including soliciting personal information or
          sharing inappropriate content involving minors. We report all
          instances of CSAM to the relevant authorities immediately.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Impersonation:
          </strong>{" "}
          Impersonate any person or entity, including a Chatrio official, or
          falsely state or otherwise misrepresent your affiliation with a person
          or entity.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Spam and Commercial Use:
          </strong>{" "}
          Post unsolicited or unauthorized advertising, promotional materials,
          "junk mail," "spam," "chain letters," "pyramid schemes," or any other
          form of solicitation.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Malware:
          </strong>{" "}
          Upload or transmit material that contains software viruses or any
          other computer code, files, or programs designed to interrupt,
          destroy, or limit the functionality of any computer software or
          hardware.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        3. User-Generated Content (UGC) & Moderation
      </h2>
      <p>
        You acknowledge that Chatrio is a passive conduit for user content. We
        do not pre-screen conversations in real-time. However, to ensure safety:
      </p>
      <ol className="list-decimal pl-5 mt-4 space-y-2">
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Monitoring:
          </strong>{" "}
          We utilize automated systems and user reports to identify and flag
          inappropriate behavior.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Right to Terminate:
          </strong>{" "}
          We reserve the right, at our sole discretion, to terminate your access
          to the Service immediately, without notice, if we believe you have
          violated these Terms.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">
            Reporting:
          </strong>{" "}
          Users are encouraged to use the "Report" button found in the chat
          interface to flag abusive partners. We take these reports seriously
          and investigate them.
        </li>
      </ol>
      <p className="mt-4">
        You understand that by using the Service, you may be exposed to content
        that is offensive, indecent, or objectionable. Under no circumstances
        will Chatrio be liable in any way for any content, including, but not
        limited to, any errors or omissions in any content, or any loss or
        damage of any kind incurred as a result of the use of any content
        transmitted via the Service.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        4. Intellectual Property
      </h2>
      <p>
        <strong className="text-slate-900 dark:text-slate-100">
          Our Content:
        </strong>{" "}
        The Service and its original content (excluding content provided by
        users), features, and functionality are and will remain the exclusive
        property of Chatrio and its licensors.
      </p>
      <p className="mt-4">
        <strong className="text-slate-900 dark:text-slate-100">
          Your Content:
        </strong>{" "}
        You retain all rights to any content you submit, post, or display on or
        through the Service. However, by submitting content, you grant Chatrio a
        worldwide, non-exclusive, royalty-free license to use, reproduce, and
        transmit such content for the purpose of providing the Service (e.g.,
        displaying your message to the recipient).
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        5. Disclaimers and Limitation of Liability
      </h2>
      <p className="uppercase text-sm tracking-wide text-slate-500 dark:text-slate-400 font-bold mb-2">
        Read this section carefully. It limits the liability of Chatrio.
      </p>
      <p>
        The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Chatrio
        makes no representations or warranties of any kind, express or implied,
        regarding the operation of the Service or the information, content, or
        materials included on the Service.
      </p>
      <p className="mt-4">
        To the full extent permissible by applicable law, Chatrio disclaims all
        warranties, express or implied, including, but not limited to, implied
        warranties of merchantability and fitness for a particular purpose.
        Chatrio does not warrant that the Service, its servers, or email sent
        from Chatrio are free of viruses or other harmful components.
      </p>
      <p className="mt-4">
        In no event shall Chatrio be liable for any damages of any kind arising
        from the use of the Service, including, but not limited to direct,
        indirect, incidental, punitive, and consequential damages.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        6. Third-Party Links and Ads
      </h2>
      <p>
        The Service contains links to third-party websites and advertisements
        (e.g., via Google AdSense). Chatrio is not responsible for the content,
        products, or services on or available from those websites or resources.
        You acknowledge and agree that Chatrio is not liable for any loss or
        damage which may be incurred by you as a result of the availability of
        those external sites or resources, or as a result of any reliance placed
        by you on the completeness, accuracy, or existence of any advertising,
        products, or other materials on, or available from, such websites or
        resources.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        7. Indemnification
      </h2>
      <p>
        You agree to defend, indemnify, and hold harmless Chatrio, its
        licensees, and licensors, and their employees, contractors, agents,
        officers, and directors, from and against any and all claims, damages,
        obligations, losses, liabilities, costs or debt, and expenses (including
        but not limited to attorney's fees), resulting from or arising out of a)
        your use and access of the Service, or b) a breach of these Terms.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        8. Governing Law
      </h2>
      <p>
        These Terms shall be governed and construed in accordance with the laws
        of [Your Country/State], without regard to its conflict of law
        provisions. Our failure to enforce any right or provision of these Terms
        will not be considered a waiver of those rights.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        9. Changes to Terms
      </h2>
      <p>
        We reserve the right, at our sole discretion, to modify or replace these
        Terms at any time. If a revision is material, we will provide at least
        30 days' notice prior to any new terms taking effect. What constitutes a
        material change will be determined at our sole discretion. By continuing
        to access or use our Service after those revisions become effective, you
        agree to be bound by the revised terms.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-slate-900 dark:text-slate-100">
        10. Contact Us
      </h2>
      <p>
        If you have any questions about these Terms, please contact us via email
        at:
        <br />
        <a
          href="mailto:chatrioapp@gmail.com"
          className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
        >
          chatrioapp@gmail.com
        </a>
      </p>

      <div className="mt-16 pt-5 border-t border-slate-200 dark:border-slate-700">
        <Link
          to="/"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 no-underline transition-colors"
        >
          <span className="mr-2">&larr;</span> Back to Home
        </Link>
      </div>
    </article>
  );
}
