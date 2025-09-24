import React, { useState, useRef, DragEvent } from 'react';
import { FileUp, HelpCircle, Upload, Music } from 'lucide-react';

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

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProcessFile = () => {
    onFileSelect(selectedFile);
  };

  const handleLoadSample = () => {
    onFileSelect(null);
  };

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="mb-8">
          <div className="bg-green-500 bg-opacity-20 p-4 rounded-full inline-block mb-4">
            <FileUp size={48} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Upload Your Spotify Data</h2>
          <p className="text-gray-400 mb-6">
            Upload your Spotify streaming history JSON file to visualize your listening habits
          </p>
          
          {spotifyConnected && (
            <div className="bg-green-500 bg-opacity-10 border border-green-500 rounded-lg p-3 mb-6 flex items-center">
              <Music className="text-green-500 mr-2 flex-shrink-0" />
              <p className="text-green-400 text-sm">
                Connected to Spotify! Your analysis will include enhanced genre and audio feature data.
              </p>
            </div>
          )}
        </div>

        <div 
          className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-colors ${
            isDragging 
              ? 'border-green-500 bg-green-500 bg-opacity-10' 
              : selectedFile 
                ? 'border-blue-500 bg-blue-500 bg-opacity-10' 
                : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".json" 
            onChange={handleFileInputChange}
          />
          
          {selectedFile ? (
            <div className="text-center">
              <div className="bg-blue-500 bg-opacity-20 p-3 rounded-full inline-block mb-3">
                <FileUp size={32} className="text-blue-400" />
              </div>
              <p className="text-lg font-medium mb-2">{selectedFile.name}</p>
              <p className="text-gray-400 mb-4">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={handleProcessFile}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg font-medium transition-colors"
              >
                Process File
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-gray-700 p-3 rounded-full inline-block mb-3">
                <Upload size={32} className="text-gray-400" />
              </div>
              <p className="text-lg font-medium mb-2">Drag & Drop your Spotify data file here</p>
              <p className="text-gray-400 mb-4">or</p>
              <button
                onClick={handleUploadClick}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium transition-colors"
              >
                Browse Files
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLoadSample}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-medium transition-colors mb-6 flex items-center justify-center"
        >
          <FileUp size={20} className="mr-2" />
          Load Sample Data Instead
        </button>

        <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg text-left">
          <div className="flex items-start mb-2">
            <HelpCircle size={20} className="text-gray-400 mr-2 mt-1 flex-shrink-0" />
            <h3 className="font-semibold">How to get your Spotify data:</h3>
          </div>
          <ol className="list-decimal list-inside text-gray-400 space-y-2 ml-6">
            <li>Go to your <a href="https://www.spotify.com/account/privacy/" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">Spotify Privacy Settings</a></li>
            <li>Request your data under "Download your data"</li>
            <li>Wait for the email from Spotify (can take up to 30 days)</li>
            <li>Download and extract the ZIP file</li>
            <li>Upload the "StreamingHistory*.json" file here</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;