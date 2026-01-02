import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskCard from '../TaskCard';
import UniversalTaskModal from '../UniversalTaskModal';
import { Task } from '../../types/task';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface DayAssistantV2ViewProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskCreate: (task: Omit<Task, 'id'>) => void;
  currentUser?: { name?: string };
}

export default function DayAssistantV2View({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
  currentUser,
}: DayAssistantV2ViewProps) {
  const router = useRouter();
  const [showUniversalModal, setShowUniversalModal] = useState(false);
  const [universalModalTask, setUniversalModalTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const chatScrollRef = useRef<FlatList>(null);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Filter tasks for today
  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.date);
    const today = new Date();
    return (
      taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear()
    );
  });

  // Categorize tasks
  const overdueTasks = todayTasks.filter(task => {
    if (!task.time) return false;
    const taskDateTime = new Date(`${task.date}T${task.time}`);
    return taskDateTime < new Date() && !task.completed;
  });

  const upcomingTasks = todayTasks.filter(task => {
    if (!task.time) return !task.completed;
    const taskDateTime = new Date(`${task.date}T${task.time}`);
    return taskDateTime >= new Date() && !task.completed;
  });

  const completedTasks = todayTasks.filter(task => task.completed);

  // Calculate progress
  const totalTasks = todayTasks.length;
  const completedCount = completedTasks.length;
  const progressPercentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage.trim();
    setChatMessage('');
    
    // Add user message to history
    const newHistory = [...chatHistory, { role: 'user' as const, content: userMessage }];
    setChatHistory(newHistory);
    setIsLoading(true);

    try {
      // Call your AI endpoint here
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: {
            tasks: todayTasks,
            date: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();
      
      // Add assistant response to history
      setChatHistory([...newHistory, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory([...newHistory, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
      // Scroll to bottom after response
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleTaskPress = (task: Task) => {
    setUniversalModalTask(task);
    setShowUniversalModal(true);
  };

  const handleTaskComplete = (taskId: string, completed: boolean) => {
    onTaskUpdate(taskId, { completed });
  };

  const renderTaskSection = (title: string, tasks: Task[], icon: string, color: string) => {
    if (tasks.length === 0) return null;

    return (
      <View style={styles.taskSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon as any} size={20} color={color} />
          <Text style={[styles.sectionTitle, { color }]}>
            {title} ({tasks.length})
          </Text>
        </View>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => handleTaskPress(task)}
            onComplete={(completed) => handleTaskComplete(task.id, completed)}
            compact
          />
        ))}
      </View>
    );
  };

  const renderChatMessage = ({ item, index }: { item: { role: 'user' | 'assistant'; content: string }; index: number }) => (
    <View
      style={[
        styles.chatMessage,
        item.role === 'user' ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      <Text style={styles.chatMessageText}>{item.content}</Text>
    </View>
  );

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{currentUser?.name || 'User'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Progress Card */}
        <Animated.View style={[styles.progressCard, { opacity: fadeAnim }]}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedCount} of {totalTasks} tasks completed
          </Text>
        </Animated.View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={24} color="#FF6B6B" />
            <Text style={styles.statNumber}>{overdueTasks.length}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#4ECDC4" />
            <Text style={styles.statNumber}>{upcomingTasks.length}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#95E1D3" />
            <Text style={styles.statNumber}>{completedTasks.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </Animated.View>

      {/* Main Content - Split View */}
      <View style={styles.mainContent}>
        {/* Tasks Column */}
        <Animated.View style={[styles.tasksColumn, { opacity: fadeAnim }]}>
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>Today's Tasks</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setUniversalModalTask(null);
                setShowUniversalModal(true);
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            ref={scrollViewRef}
            style={styles.tasksScroll}
            contentContainerStyle={styles.tasksContent}
            showsVerticalScrollIndicator={false}
          >
            {totalTasks === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No tasks for today</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap the + button to add a task
                </Text>
              </View>
            ) : (
              <>
                {renderTaskSection('Overdue', overdueTasks, 'alert-circle', '#FF6B6B')}
                {renderTaskSection('Upcoming', upcomingTasks, 'time', '#4ECDC4')}
                {renderTaskSection('Completed', completedTasks, 'checkmark-circle', '#95E1D3')}
              </>
            )}
          </ScrollView>
        </Animated.View>

        {/* Chat Column */}
        <Animated.View style={[styles.chatColumn, { opacity: fadeAnim }]}>
          <View style={styles.columnHeader}>
            <Ionicons name="chatbubbles" size={24} color="#4ECDC4" />
            <Text style={styles.columnTitle}>AI Assistant</Text>
          </View>

          {chatHistory.length === 0 ? (
            <View style={styles.chatEmptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>Start a conversation</Text>
              <Text style={styles.emptyStateSubtext}>
                Ask me about your tasks, schedule, or anything else!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={chatScrollRef}
              data={chatHistory}
              renderItem={renderChatMessage}
              keyExtractor={(item, index) => index.toString()}
              style={styles.chatHistory}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {isLoading && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color="#4ECDC4" />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          )}

          {/* Chat Input */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Ask me anything..."
              placeholderTextColor="#999"
              value={chatMessage}
              onChangeText={setChatMessage}
              onSubmitEditing={handleSendMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !chatMessage.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!chatMessage.trim() || isLoading}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Universal Task Modal */}
      <UniversalTaskModal
        visible={showUniversalModal}
        onClose={() => {
          setShowUniversalModal(false);
          setUniversalModalTask(null);
        }}
        onSave={(taskData) => {
          if (universalModalTask) {
            onTaskUpdate(universalModalTask.id, taskData);
          } else {
            onTaskCreate(taskData as Omit<Task, 'id'>);
          }
          setShowUniversalModal(false);
          setUniversalModalTask(null);
        }}
        initialTask={universalModalTask}
        initialDate={selectedDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  progressCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  tasksColumn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chatColumn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#4ECDC4',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksScroll: {
    flex: 1,
  },
  tasksContent: {
    padding: 16,
  },
  taskSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  chatEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  chatHistory: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
  },
  chatMessage: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4ECDC4',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  chatMessageText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4ECDC4',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});