import React from 'react';

export interface ChatWidget {
  title: string;
  buttonLabel: string;
  action: 'alert';
  alertMessage?: string;
}

interface WidgetRendererProps {
  widget: ChatWidget;
}

/**
 * Renders a minimal widget returned by the assistant.  For now the only
 * supported action is `alert`, which simply shows a browser alert when the
 * button is pressed.  This component is designed to live inside the chat
 * message area under a bot response.
 */
const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget }) => {
  const handleClick = () => {
    if (widget.action === 'alert') {
      window.alert(widget.alertMessage ?? widget.title);
    }
  };

  return (
    <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
      <div className="font-medium mb-1">{widget.title}</div>
      <button
        onClick={handleClick}
        className="px-3 py-1 bg-primary text-white rounded hover:bg-action"
      >
        {widget.buttonLabel}
      </button>
    </div>
  );
};

export default WidgetRenderer;
