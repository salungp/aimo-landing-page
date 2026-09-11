import Container from "../Container";
import Reveal from "../Reveal";

type Step = {
  number: string;
  title: string;
  body: string;
};

const steps: Step[] = [
  {
    number: "01",
    title: "Sign up",
    body: "Create your Aimo account.",
  },
  {
    number: "02",
    title: "Fund your main wallet",
    body: "Deposit into your main wallet.",
  },
  {
    number: "03",
    title: "Move where you trade",
    body: "Move funds to the wallet.",
  },
  {
    number: "04",
    title: "Make your move",
    body: "Move funds to the wallet.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 tablet:py-28 desktop:py-20">
      <Container>
        <Reveal from="up">
          <h2 className="max-w-[560px] text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white tablet:max-w-none tablet:text-[40px] desktop:text-[48px]">
            Start with{" "}
            <span className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
              one wallet.
            </span>{" "}
            Grow into every market.
          </h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-3 tablet:mt-14 tablet:grid-cols-2 desktop:mt-[50px] desktop:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal key={step.number} from="up" delay={i * 0.08}>
              <StepCard step={step} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <div className="relative flex h-[220px] flex-col justify-between overflow-hidden rounded-[20px] bg-[#171f1a] px-4 py-5 tablet:h-[240px] desktop:h-[280px]">
      {/* Faint green wash across the top of the card, matching the Figma fill exactly. */}
      <div className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-[rgba(37,61,2,0.4)] to-[rgba(37,61,2,0)]" />

      <p className="relative text-[48px] leading-none font-bold tracking-[-0.01em] text-white/10">
        {step.number}
      </p>

      <div className="relative flex flex-col gap-1.5">
        <p className="text-lg leading-[normal] font-semibold tracking-[-0.01em] text-white">
          {step.title}
        </p>
        <p className="text-sm leading-[1.5] tracking-[-0.01em] text-black-50">
          {step.body}
        </p>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_4px_1px_rgba(255,255,255,0.06)]" />
    </div>
  );
}
