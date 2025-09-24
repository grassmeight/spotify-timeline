import React, { useState, useRef, DragEvent } from 'react';
import { FileUp, HelpCircle, Upload, Music, BarChart3 } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.json')) {
        setSelectedFile(file);
      } else {
        alert('Please upload a JSON file.');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.endsWith('.json')) {
        setSelectedFile(file);
      } else {
        alert('Please upload a JSON file.');
      }
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleLoadSample = () => {
    onFileSelect(null); // null triggers sample data loading
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 rounded-xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="bg-green-500 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Music className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Upload Your Spotify Data</h2>
          <p className="text-gray-400 text-lg">
            Upload your Spotify streaming history JSON file to analyze your music taste and discover insights.
          </p>
        </div>

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            isDragging 
              ? 'border-green-500 bg-green-500 bg-opacity-10' 
              : selectedFile 
              ? 'border-green-400 bg-green-400 bg-opacity-5'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <FileUp className="h-16 w-16 text-green-400 mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-green-400 mb-2">File Selected!</h3>
                <p className="text-gray-300 font-medium">{selectedFile.name}</p>
                <p className="text-gray-400 text-sm">
                  Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleUpload}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Process File
                </button>
                <button
                  onClick={handleReset}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Choose Different File
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-16 w-16 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-xl font-bold mb-2">Drop your Spotify data file here</h3>
                <p className="text-gray-400 mb-4">or click to browse your files</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Choose File
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={handleLoadSample}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <BarChart3 className="h-5 w-5" />
            <span>Try Sample Data</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-700 p-6 rounded-lg">
          <h3 className="font-bold mb-4 flex items-center">
            <HelpCircle className="h-5 w-5 text-yellow-400 mr-2" />
            How to Get Your Spotify Data
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Go to your Spotify Account Privacy Settings</li>
            <li>Scroll down to "Download your data" and click "Request"</li>
            <li>Select "Extended streaming history" for the most comprehensive data</li>
            <li>Wait for Spotify to email you the download link (can take up to 30 days)</li>
            <li>Download and extract the ZIP file</li>
            <li>Upload the JSON file (typically named "Streaming_History_Audio_*.json")</li>
          </ol>
          <p className="text-sm text-gray-400 mt-4">
            💡 Tip: The extended streaming history provides much more detailed data than the basic export.
          </p>
        </div>

        {/* Sample Data Info */}
        <div className="mt-6 bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg p-4">
          <h3 className="font-semibold text-blue-200 mb-2">Don't have your data yet?</h3>
          <p className="text-blue-300 text-sm">
            Try the sample data to explore all the features while you wait for your Spotify data export.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;