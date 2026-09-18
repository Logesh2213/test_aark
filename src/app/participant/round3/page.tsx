'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isParticipant } from '@/lib/auth';

export default function ParticipantRound3Page() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const videos = useStore((state) => state.videos);
  const round3State = useStore((state) => state.round3State);
  const eventState = useStore((state) => state.eventState);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const addVideo = useStore((state) => state.addVideo);
  const updateVideo = useStore((state) => state.updateVideo);
  
  useEffect(() => {
    if (!currentUser || !isParticipant(currentUser)) {
      router.push('/login');
    }
  }, [currentUser, router]);
  
  if (!currentUser || !isParticipant(currentUser)) {
    return null;
  }
  
  const team = teams.find((t) => t.id === currentUser.team_id);
  const existingVideo = videos.find((v) => v.team_id === currentUser.team_id);
  const isDeadlinePassed = round3State.upload_deadline ? new Date(round3State.upload_deadline) < new Date() : false;
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size
    const maxSize = round3State.max_file_size * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxSize) {
      alert(`File size exceeds maximum of ${round3State.max_file_size} MB`);
      return;
    }
    
    // Check file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload MP4, MOV, or WEBM files.');
      return;
    }
    
    setSelectedFile(file);
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    clearInterval(interval);
    
    // Determine status based on deadline
    const status = isDeadlinePassed ? 'late' : 'submitted';
    
    // In a real implementation, this would upload to cloud storage
    // For now, we'll store a placeholder URL
    const videoUrl = `https://storage.example.com/videos/${currentUser.team_id}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
    
    if (existingVideo) {
      updateVideo(existingVideo.id, {
        file_url: videoUrl,
        uploaded_at: new Date().toISOString(),
        status,
      });
    } else {
      addVideo({
        id: `vid_${Date.now()}`,
        team_id: currentUser.team_id!,
        file_url: videoUrl,
        uploaded_at: new Date().toISOString(),
        status,
      });
    }
    
    setUploading(false);
    setSelectedFile(null);
    setUploadProgress(0);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Round 3 - Promotion Video</span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-400">{team?.team_name}</p>
              <p className="text-xs text-gray-500">Team {team?.team_number}</p>
            </div>
            <button
              onClick={() => router.push('/participant/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>
      
      <main className="p-6">
        {/* Round Status */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Round Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm ${
              round3State.active ? 'bg-green-600' : 'bg-gray-600'
            }`}>
              {round3State.active ? 'Active' : 'Not Started'}
            </span>
          </div>
          <p className="text-gray-400">{eventState.current_activity}</p>
        </div>
        
        {/* Deadline Information */}
        {round3State.active && round3State.upload_deadline && (
          <div className={`rounded-lg p-6 border mb-6 ${
            isDeadlinePassed ? 'bg-red-900/30 border-red-700' : 'bg-blue-900/30 border-blue-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Upload Deadline</h3>
                <p className="text-2xl font-semibold">{new Date(round3State.upload_deadline).toLocaleString()}</p>
                <p className="text-gray-400 text-sm mt-1">Max File Size: {round3State.max_file_size} MB</p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${isDeadlinePassed ? 'text-red-400' : 'text-green-400'}`}>
                  {isDeadlinePassed ? 'EXPIRED' : 'OPEN'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {isDeadlinePassed ? 'Submissions are closed' : 'Submissions are open'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Upload Area */}
        {round3State.active && !existingVideo && !isDeadlinePassed && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Upload Promotion Video</h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors">
                <input
                  type="file"
                  id="video-upload"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer"
                >
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-lg font-semibold">Click to upload or drag and drop</p>
                    <p className="text-sm">MP4, MOV, or WEBM (Max {round3State.max_file_size} MB)</p>
                  </div>
                </label>
              </div>
              
              {selectedFile && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{selectedFile.name}</p>
                    <p className="text-sm text-gray-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  
                  {uploading ? (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400 text-center">{uploadProgress}%</p>
                </div>
              ) : (
                <button
                  onClick={handleUpload}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
                >
                  Upload Video
                </button>
              )}
            </div>
          )}
        </div>
          </div>
        )}
      
      {/* Existing Video */}
      {existingVideo && (
        <div className={`rounded-lg p-6 border mb-6 ${
          existingVideo.status === 'submitted' ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'
        }`}>
          <h2 className="text-xl font-bold mb-4">Your Video</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                existingVideo.status === 'submitted' ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {existingVideo.status.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Uploaded At:</span>
              <span>{new Date(existingVideo.uploaded_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">File URL:</span>
              <span className="text-blue-400 text-sm truncate max-w-xs">{existingVideo.file_url}</span>
            </div>
          </div>
          
          {existingVideo.status === 'late' && (
            <div className="mt-4 p-3 bg-red-900/50 rounded-lg text-center">
              <p className="text-red-400 font-semibold">Late Submission</p>
              <p className="text-gray-400 text-sm">Your video was submitted after the deadline</p>
            </div>
          )}
        </div>
      )}
      
      {/* Deadline Passed */}
        {round3State.active && isDeadlinePassed && !existingVideo && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 mb-6">
            <div className="text-center">
              <p className="text-red-400 text-xl font-bold mb-2">Deadline Passed</p>
              <p className="text-gray-400">The upload deadline has expired. Video submissions are no longer accepted.</p>
            </div>
          </div>
        )}
        
        {/* Instructions */}
        {round3State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Instructions</h2>
            <div className="space-y-3 text-gray-300">
              <p>• Create a one-minute promotional video for your company and zone.</p>
              <p>• Highlight your zone's strengths, your team's vision, and your proposed solutions.</p>
              <p>• Be creative and professional - this video will be judged by the ARKK Board.</p>
              <p>• Upload your video before the deadline to avoid late submission penalties.</p>
              <p>• Allowed file formats: MP4, MOV, WEBM</p>
              <p>• Maximum file size: {round3State.max_file_size} MB</p>
            </div>
          </div>
        )}
        
        {/* Round Not Started */}
        {!round3State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">Round 3 has not started yet</p>
              <p className="text-gray-500 text-sm mt-2">Wait for the Admin to begin the round</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
