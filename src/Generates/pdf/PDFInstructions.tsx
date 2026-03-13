import React from 'react';
import { FileText, Download, Printer, Eye, CheckCircle, Info } from 'lucide-react';

interface PDFInstructionsProps {
  className?: string;
}

export const PDFInstructions: React.FC<PDFInstructionsProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-green-600" />
        <h3 className="font-bold text-gray-900">PDF Receipt Options</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex-shrink-0">
            <Printer className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">Print View</p>
            <p className="text-xs text-gray-600">Use browser's print function for quick printing</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="mt-1 flex-shrink-0">
            <Eye className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">Preview PDF</p>
            <p className="text-xs text-gray-600">Open PDF in new tab for review before downloading</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="mt-1 flex-shrink-0">
            <Download className="w-4 h-4 text-green-700" />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">Download PDF</p>
            <p className="text-xs text-gray-600">Save high-quality PDF file to your device</p>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600">
              PDF receipts include all document information, signature history, and are formatted for professional use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFInstructions;