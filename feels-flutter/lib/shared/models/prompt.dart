class Prompt {
  final String question;
  final String answer;

  const Prompt({
    required this.question,
    required this.answer,
  });

  factory Prompt.fromJson(Map<String, dynamic> json) {
    return Prompt(
      question: json['question'] as String,
      answer: json['answer'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'question': question,
      'answer': answer,
    };
  }

  Prompt copyWith({
    String? question,
    String? answer,
  }) {
    return Prompt(
      question: question ?? this.question,
      answer: answer ?? this.answer,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Prompt &&
          runtimeType == other.runtimeType &&
          question == other.question &&
          answer == other.answer;

  @override
  int get hashCode => question.hashCode ^ answer.hashCode;

  @override
  String toString() => 'Prompt(question: $question, answer: $answer)';
}
