import { motion } from "framer-motion";
import {
  Users,
  DollarSign,
  Star,
  Mail,
  Crown,
  Globe,
  MessageCircle,
} from "lucide-react";

const WHATSAPP_NUMBER = "+923149363009";
const WHATSAPP_DISPLAY = "+92 314 9363009";
const SUPPORT_EMAIL = "logicguild186@gmail.com";

const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}`;
const emailLink = `mailto:${SUPPORT_EMAIL}`;

const PRICING = [
  {
    name: "Basic",
    pakistan: "PKR 1,000",
    international: "20",
    description: "2 skills",
    icon: Users,
  },
  {
    name: "Premium",
    pakistan: "PKR 2,500",
    international: "35",
    description: "5 skills",
    icon: Star,
  },
  {
    name: "Gold",
    pakistan: "PKR 6,000",
    international: "70",
    description: "Unlimited skills",
    icon: Crown,
    highlight: true,
  },
];

export default function Reseller() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black text-white mb-4">
            <Users size={28} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold">
            Opportunity Hub Reseller Program
          </h1>

          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Earn commission by introducing Opportunity Hub to teachers,
            coaches, freelancers, and other professionals who need quality
            opportunities.
          </p>
        </motion.div>

        {/* Commission */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 p-6 sm:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="text-black" size={26} />
            <h2 className="text-2xl font-bold">Your Commission</h2>
          </div>

          <p className="text-gray-700 leading-7">
            Resellers earn <strong>30% commission</strong> on every active
            paid subscription generated through their reseller link.
          </p>

          <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-5">
            <p className="font-semibold">
              Every 10th subscription earns <strong>100% commission</strong>.
            </p>

            <p className="text-sm text-gray-600 mt-2">
              Example: on the first 9 qualifying subscriptions you earn 30%
              commission. On the 10th qualifying subscription, you earn 100%
              commission.
            </p>
          </div>
        </motion.section>

        {/* Pricing */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-5">
            <Globe size={26} />
            <h2 className="text-2xl font-bold">Subscription Plans</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRICING.map((plan) => {
              const Icon = plan.icon;

              return (
                <div
                  key={plan.name}
                  className={`rounded-2xl border p-6 ${
                    plan.highlight
                      ? "border-black shadow-md"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {plan.description}
                      </p>
                    </div>

                    <Icon size={24} />
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Pakistan
                    </p>

                    <p className="text-2xl font-bold mt-1">
                      {plan.pakistan}
                      <span className="text-sm font-normal text-gray-500">
                        {" "}
                        / month
                      </span>
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      International customers
                    </p>

                    <p className="text-2xl font-bold mt-1">
                      {plan.international}
                      <span className="text-sm font-normal text-gray-500">
                        {" "}
                        / month
                      </span>
                    </p>

                    <p className="text-sm font-semibold text-gray-700 mt-2">
                      Charged in your local currency
                    </p>

                    <p className="text-xs text-gray-500 mt-2 leading-5">
                      This international price is a local-currency amount.
                      For example, customers may pay in USD, GBP, AED, SAR,
                      QAR, KWD, BHD, or OMR depending on their country.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Important international payment notice */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gray-50 border border-gray-200 p-6 sm:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Globe size={25} />
            <h2 className="text-xl font-bold">
              🌍 International Pricing & Payment
            </h2>
          </div>

          <p className="text-gray-700 leading-7">
            <strong>
              For customers outside Pakistan, our international plans are
              20 / 35 / 70 in the customer's local currency.
            </strong>
          </p>

          <p className="text-gray-600 leading-7 mt-3">
            The currency depends on the customer's country. For example,
            customers in the USA may pay in USD, customers in the UK in GBP,
            and customers in Gulf countries may pay in AED, SAR, QAR, KWD,
            BHD, or OMR as applicable.
          </p>

          <p className="text-gray-600 leading-7 mt-3">
            <strong>
              Payment is completed outside the app using the payment method
              provided by our team.
            </strong>
          </p>
        </motion.section>

        {/* Gold reseller bonus */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 p-6 sm:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Crown size={26} />
            <h2 className="text-2xl font-bold">Gold Reseller Reward</h2>
          </div>

          <p className="text-gray-700 leading-7">
            Resellers who generate <strong>2 active Gold subscriptions</strong>
            can qualify for the Gold reseller reward.
          </p>
        </motion.section>

        {/* How to join */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 p-6 sm:p-8 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">How to Join</h2>

          <ol className="list-decimal pl-5 space-y-3 text-gray-700">
            <li>Contact our team and request your reseller link.</li>
            <li>Share your unique reseller link with potential customers.</li>
            <li>Customers subscribe through your link.</li>
            <li>
              Your qualifying paid subscriptions are counted toward your
              commission.
            </li>
            <li>
              Commission status and payment details can be confirmed with our
              support team.
            </li>
          </ol>
        </motion.section>

        {/* Contact */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 0, y: 0 }}
          className="rounded-2xl bg-black text-white p-6 sm:p-8"
        >
          <h2 className="text-2xl font-bold mb-3">
            Need Help With the Reseller Program?
          </h2>

          <p className="text-gray-300 leading-7 mb-6">
            Contact us directly for reseller registration, payment
            instructions, commission questions, or your reseller link.
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">WhatsApp</p>
              <p className="font-semibold text-lg">{WHATSAPP_DISPLAY}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="font-semibold text-lg break-all">
                {SUPPORT_EMAIL}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black px-5 py-3 font-semibold hover:bg-gray-100 transition"
            >
              <MessageCircle size={20} />
              Contact on WhatsApp
            </a>

            <a
              href={emailLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white px-5 py-3 font-semibold hover:bg-white hover:text-black transition"
            >
              <Mail size={20} />
              Email Support
            </a>
          </div>
        </motion.section>

      </div>
    </div>
  );
  }
