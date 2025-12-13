import React from 'react';
import { Decision, DecisionOption } from '@/types/decision';
import { Calendar, Users, CheckCircle, XCircle, Clock, TrendUp, 
  CowboyHat, Lightbulb, Target, Flag, Brain, Scale, 
  ChartBar, GitBranch, Path, Crosshair, MapPin, Compass, 
  Aperture, CircleDashed, Activity, Pulse, Eye, Focus } from '@phosphor-icons/react';

interface DecisionDetailProps {
  decision: Decision;
  onClose: () => void;
}

const DecisionDetail: React.FC<DecisionDetailProps> = ({ decision, onClose }) => {
  const getStatusIcon = () => {
    switch (decision.status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    switch (decision.status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = () => {
    switch (decision.category) {
      case 'personal':
        return <Users className="w-5 h-5" />;
      case 'professional':
        return <TrendUp className="w-5 h-5" />;
      case 'financial':
        return <ChartBar className="w-5 h-5" />;
      case 'health':
        return <Activity className="w-5 h-5" />;
      case 'relationships':
        return <Users className="w-5 h-5" />;
      case 'education':
        return <Brain className="w-5 h-5" />;
      case 'lifestyle':
        return <Compass className="w-5 h-5" />;
      case 'other':
        return <CircleDashed className="w-5 h-5" />;
      default:
        return <CircleDashed className="w-5 h-5" />;
    }
  };

  const getPriorityIcon = () => {
    switch (decision.priority) {
      case 'low':
        return <Flag className="w-4 h-4" weight="light" />;
      case 'medium':
        return <Flag className="w-4 h-4" weight="regular" />;
      case 'high':
        return <Flag className="w-4 h-4" weight="fill" />;
      default:
        return <Flag className="w-4 h-4" />;
    }
  };

  const getPriorityColor = () => {
    switch (decision.priority) {
      case 'low':
        return 'text-blue-600 bg-blue-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'high':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  const getWinningOption = () => {
    if (!decision.options || decision.options.length === 0) return null;
    return decision.options.reduce((prev, current) =>
      (current.score || 0) > (prev.score || 0) ? current : prev
    );
  };

  const winningOption = getWinningOption();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${getStatusColor()}`}>
                  {getStatusIcon()}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{decision.title}</h2>
              </div>
              <p className="text-gray-600 mt-2">{decision.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(decision.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-600">{getCategoryIcon()}</div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {decision.category}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`p-1.5 rounded ${getPriorityColor()}`}>
                {getPriorityIcon()}
              </div>
              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {decision.priority}
                </p>
              </div>
            </div>
          </div>

          {/* Decision Maker */}
          {winningOption && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CowboyHat className="w-5 h-5 text-green-600" weight="fill" />
                <h3 className="text-lg font-semibold text-green-900">Recommended Choice</h3>
              </div>
              <p className="text-green-800 font-medium">{winningOption.title}</p>
              <p className="text-sm text-green-700 mt-1">{winningOption.description}</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    Score: {winningOption.score?.toFixed(1) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          {decision.options && decision.options.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CowboyHat className="w-5 h-5" />
                Options Considered
              </h3>
              <div className="space-y-3">
                {decision.options.map((option, index) => (
                  <div
                    key={option.id || index}
                    className={`border rounded-lg p-4 ${
                      option.id === winningOption?.id
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{option.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {option.score?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                    </div>

                    {/* Pros and Cons */}
                    {(option.pros && option.pros.length > 0) || (option.cons && option.cons.length > 0) ? (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {option.pros && option.pros.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-700">Pros</span>
                            </div>
                            <ul className="text-sm text-gray-700 space-y-1">
                              {option.pros.map((pro, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-green-600 mt-0.5">•</span>
                                  <span>{pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {option.cons && option.cons.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="text-xs font-medium text-red-700">Cons</span>
                            </div>
                            <ul className="text-sm text-gray-700 space-y-1">
                              {option.cons.map((con, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-red-600 mt-0.5">•</span>
                                  <span>{con}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Criteria */}
          {decision.criteria && decision.criteria.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Decision Criteria
              </h3>
              <div className="space-y-2">
                {decision.criteria.map((criterion, index) => (
                  <div
                    key={criterion.id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{criterion.name}</p>
                      {criterion.description && (
                        <p className="text-sm text-gray-600 mt-0.5">{criterion.description}</p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          Weight: {criterion.weight}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {decision.notes && decision.notes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Notes & Insights
              </h3>
              <div className="space-y-2">
                {decision.notes.map((note, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {decision.tags && decision.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {decision.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DecisionDetail;