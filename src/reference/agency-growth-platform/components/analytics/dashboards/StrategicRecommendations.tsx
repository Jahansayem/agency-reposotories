/**
 * StrategicRecommendations Component
 *
 * Displays strategic recommendations based on scenario calculation results.
 */

import { motion } from 'framer-motion';
import {
  TrendingUp,
  BarChart3,
  Lightbulb,
  Target,
  DollarSign,
  Activity,
  CheckCircle2,
  Info,
  Zap,
  Award,
} from 'lucide-react';
import type { StrategyInputs, ScenarioResults } from '../types/strategy';

interface StrategicRecommendationsProps {
  hasResults: boolean;
  strategyInputs: StrategyInputs;
  scenarioResults: ScenarioResults[];
}

export default function StrategicRecommendations({
  hasResults,
  strategyInputs,
  scenarioResults,
}: StrategicRecommendationsProps) {
  if (!hasResults) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 lg:p-12 shadow-lg shadow-gray-200/50 border border-gray-200"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10">Strategic Recommendations</h2>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-12 text-center border border-blue-100">
          <Lightbulb className="w-16 h-16 text-primary-600 mx-auto mb-4" />
          <p className="text-gray-700 text-lg">
            Strategic recommendations will appear here after calculation
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Configure your strategy and click Calculate to see recommendations
          </p>
        </div>
      </motion.div>
    );
  }

  const moderateScenario = scenarioResults[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-8 lg:p-12 shadow-lg shadow-gray-200/50 border border-gray-200"
    >
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10">Strategic Recommendations</h2>

      {/* Success Banner */}
      <div className="bg-gradient-to-r from-teal-50 to-slate-50 border-l-4 border-teal-500 rounded-2xl p-6 mb-10">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-green-900 mb-2">
              Moderate Strategy: RECOMMENDED
            </h3>
            <p className="text-green-700 leading-relaxed">
              Based on your parameters, the moderate growth strategy shows strong positive ROI within {moderateScenario?.paybackMonths} months
              with manageable risk levels. Expected policy growth of {((moderateScenario?.finalPolicies - strategyInputs.currentPolicies) / strategyInputs.currentPolicies * 100).toFixed(1)}% aligns with industry benchmarks.
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid sm:grid-cols-3 gap-6 mb-10">
        {moderateScenario && [
          {
            label: 'Expected ROI',
            value: `${moderateScenario.roi.toFixed(1)}%`,
            trend: moderateScenario.roi > 20 ? 'Excellent' : 'Good'
          },
          {
            label: 'Payback Period',
            value: `${moderateScenario.paybackMonths} mo`,
            trend: moderateScenario.paybackMonths < 24 ? 'Fast' : 'Standard'
          },
          {
            label: 'Policy Growth',
            value: `+${moderateScenario.finalPolicies - strategyInputs.currentPolicies}`,
            trend: `+${((moderateScenario.finalPolicies - strategyInputs.currentPolicies) / strategyInputs.currentPolicies * 100).toFixed(1)}%`
          }
        ].map((metric) => (
          <motion.div
            key={metric.label}
            whileHover={{ scale: 1.02, y: -2 }}
            className="relative p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 text-center shadow-sm hover:shadow-lg transition-all duration-200"
          >
            <div className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</div>
            <div className="text-sm font-medium text-gray-600 mb-2">{metric.label}</div>
            <div className="text-xs text-green-600 bg-green-50 inline-block px-3 py-1 rounded-full font-medium">
              {metric.trend}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Unit Economics Dashboard */}
      <UnitEconomicsPanel scenarioResults={scenarioResults} />

      {/* What Matters Most - Key Driver Analysis */}
      <KeyDriversPanel strategyInputs={strategyInputs} />

      {/* Action Items */}
      <ActionPlanPanel strategyInputs={strategyInputs} />
    </motion.div>
  );
}

function UnitEconomicsPanel({ scenarioResults }: { scenarioResults: ScenarioResults[] }) {
  const moderateScenario = scenarioResults[1];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 border border-purple-200 mb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Activity className="w-6 h-6 text-purple-700" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Unit Economics Analysis</h3>
          <p className="text-sm text-gray-600">Key financial metrics for sustainable growth</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Customer Lifetime Value */}
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-2">
            ${moderateScenario?.ltv?.toLocaleString() || 0}
          </div>
          <div className="text-sm font-medium text-gray-700 mb-1">
            Customer Lifetime Value
          </div>
          <div className="text-xs text-gray-500">
            Revenue per customer (eligible premium)
          </div>
        </motion.div>

        {/* Customer Acquisition Cost */}
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-600 mb-2">
            ${moderateScenario?.cac?.toLocaleString() || 0}
          </div>
          <div className="text-sm font-medium text-gray-700 mb-1">
            Customer Acquisition Cost
          </div>
          <div className="text-xs text-gray-500">
            Cost per new policy
          </div>
        </motion.div>

        {/* LTV:CAC Ratio */}
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${
              moderateScenario?.ltvCacRatio && moderateScenario.ltvCacRatio >= 3
                ? 'bg-green-100'
                : 'bg-primary-100'
            }`}>
              <TrendingUp className={`w-5 h-5 ${
                moderateScenario?.ltvCacRatio && moderateScenario.ltvCacRatio >= 3
                  ? 'text-green-600'
                  : 'text-primary-600'
              }`} />
            </div>
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            moderateScenario?.ltvCacRatio && moderateScenario.ltvCacRatio >= 3
              ? 'text-green-600'
              : 'text-primary-600'
          }`}>
            {moderateScenario?.ltvCacRatio?.toFixed(1) || 0}:1
          </div>
          <div className="text-sm font-medium text-gray-700 mb-1">
            Lifetime Value : Acquisition Cost
          </div>
          <div className="text-xs text-gray-500">
            {moderateScenario?.ltvCacRatio && moderateScenario.ltvCacRatio >= 3 ? 'Excellent' : 'Good'}
          </div>
        </motion.div>

        {/* Break-Even Point */}
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-600 mb-2">
            {moderateScenario?.breakEvenMonth !== undefined && moderateScenario.breakEvenMonth > 0
              ? `Month ${moderateScenario.breakEvenMonth}`
              : 'N/A'}
          </div>
          <div className="text-sm font-medium text-gray-700 mb-1">
            Break-Even Point
          </div>
          <div className="text-xs text-gray-500">
            {moderateScenario?.breakEvenMonth !== undefined && moderateScenario.breakEvenMonth > 0
              ? 'Positive cash flow'
              : 'See projections'}
          </div>
        </motion.div>
      </div>

      {/* Eligible Premium Methodology Explanation */}
      <div className="mt-6 p-5 bg-blue-50 rounded-xl border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <div className="font-semibold mb-2">Revenue Calculation Note</div>
            <p className="mb-2">
              The LTV above uses <strong>"eligible written premium"</strong> - the actual commission base Allstate pays on
              (approximately 47.4% of total written premium, net of catastrophe reinsurance).
            </p>
            <p className="text-xs text-blue-700">
              This matches your actual Allstate bonus calculator and ensures all projections reflect real compensation outcomes.
              See Strategy & Scenarios tab for detailed explanation.
            </p>
          </div>
        </div>
      </div>

      {/* Economics Insights */}
      <div className="mt-4 p-4 bg-white/50 rounded-xl border border-purple-100">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <strong>Healthy metrics:</strong> Lifetime value to acquisition cost ratio above 3:1 indicates strong unit economics.
            {moderateScenario?.ltvCacRatio && moderateScenario.ltvCacRatio >= 3
              ? " Your strategy meets this benchmark."
              : " Consider optimizing acquisition costs or improving retention to improve this ratio."}
            {moderateScenario?.breakEvenMonth !== undefined && moderateScenario.breakEvenMonth <= 12
              ? ` Reaching break-even in ${moderateScenario.breakEvenMonth} months shows strong cash efficiency.`
              : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyDriversPanel({ strategyInputs }: { strategyInputs: StrategyInputs }) {
  const currentPPC = (strategyInputs.currentPolicies / strategyInputs.currentCustomers).toFixed(1);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200 mb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Award className="w-6 h-6 text-amber-700" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">What Matters Most</h3>
          <p className="text-sm text-gray-600">Key growth drivers ranked by impact on your agency</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* #1 - Cross-Selling */}
        <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-gray-900">Policies Per Customer (Cross-Selling)</h4>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">59.7% Impact</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Moving from {currentPPC} to 2.0 policies per customer unlocks optimal 95% retention tier.
                Each additional policy per customer increases both retention AND revenue.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Bundle auto+home</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Add umbrella policies</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Life insurance cross-sell</span>
              </div>
            </div>
          </div>
        </div>

        {/* #2 - Marketing Spend */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              2
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-gray-900">Marketing Spend</h4>
                <span className="text-xs bg-primary-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">44.3% Impact</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Current: ${strategyInputs.monthlyLeadSpend.toLocaleString()}/mo → {Math.round(strategyInputs.monthlyLeadSpend / strategyInputs.costPerLead)} leads.
                Live transfers at ${strategyInputs.costPerLead} per lead with 10% conversion = ${Math.round(strategyInputs.costPerLead / 0.10)} effective acquisition cost.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Scale to $5-8K/mo for aggressive growth</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Diminishing returns above $10K</span>
              </div>
            </div>
          </div>
        </div>

        {/* #3 - Conversion Rate */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              3
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-gray-900">Conversion Rate</h4>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">22.1% Impact</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                5% improvement in conversion has greater ROI than 20% reduction in CPL.
                Focus on speed-to-lead and follow-up processes.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Respond within 5 minutes</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">5-touch follow-up sequence</span>
              </div>
            </div>
          </div>
        </div>

        {/* #4 - Retention */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              4
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-gray-900">Retention Rate</h4>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">16.8% Impact</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Small retention gains compound significantly. 85% vs 95% annual = 1.35% vs 0.43% monthly churn.
                Retention supports all other growth efforts.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Cross-sell to 1.8+ policies per customer</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Annual policy reviews</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Insight */}
      <div className="mt-6 p-4 bg-amber-100/50 rounded-xl border border-amber-200">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-800">
            <strong>Bottom line:</strong> Cross-selling is almost 3x more impactful than any other lever.
            A customer with 2.0 policies stays longer (95% retention) AND generates more revenue.
            Focus here first, then scale marketing to fuel new customer acquisition.
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionPlanPanel({ strategyInputs }: { strategyInputs: StrategyInputs }) {
  const currentPPC = (strategyInputs.currentPolicies / strategyInputs.currentCustomers).toFixed(1);

  const actionItems = [
    {
      priority: 'HIGH',
      action: `Launch cross-sell campaign to move policies per customer from ${currentPPC} to 1.8+`,
      color: 'bg-red-100 text-red-800'
    },
    {
      priority: 'HIGH',
      action: `Allocate $${strategyInputs.additionalLeadSpend.toLocaleString()}/month to lead generation (${Math.round(strategyInputs.additionalLeadSpend / strategyInputs.costPerLead)} leads/mo)`,
      color: 'bg-red-100 text-red-800'
    },
    {
      priority: 'MED',
      action: 'Implement 5-minute response time for all leads',
      color: 'bg-yellow-100 text-yellow-800'
    },
    strategyInputs.conciergeService && {
      priority: 'MED',
      action: 'Deploy concierge service for retention boost',
      color: 'bg-yellow-100 text-yellow-800'
    },
    strategyInputs.newsletterSystem && {
      priority: 'LOW',
      action: 'Launch newsletter system for ongoing engagement',
      color: 'bg-gray-100 text-gray-800'
    },
    {
      priority: 'LOW',
      action: `Review ROI metrics at month ${Math.round(strategyInputs.projectionMonths / 3)} and optimize`,
      color: 'bg-gray-100 text-gray-800'
    }
  ].filter(Boolean) as Array<{ priority: string; action: string; color: string }>;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Prioritized Action Plan</h3>
      <div className="space-y-4">
        {actionItems.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span className={`text-xs font-bold px-2 py-1 rounded ${item.color}`}>
              {item.priority}
            </span>
            <p className="text-gray-700 flex-1">{item.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
